#!/usr/bin/env Rscript
#
# Gene Set Enrichment Analysis (GSEA) using fgsea + msigdbr
#
# This standalone script runs GSEA on DEGs results and produces
# an interactive HTML report with enrichment plots and summary tables.
#

# Check for required packages before loading
required_packages <- c("fgsea", "msigdbr", "optparse", "dplyr", "data.table",
                        "ggplot2", "plotly", "htmltools", "htmlwidgets", "DT")
missing <- required_packages[!sapply(required_packages, requireNamespace, quietly = TRUE)]
if (length(missing) > 0) {
  stop(
    "The following required R packages are not installed: ",
    paste(missing, collapse = ", "),
    "\nPlease install them before running this script.\n",
    "  install.packages(c('optparse','dplyr','data.table','ggplot2','plotly',",
    "'htmltools','htmlwidgets','DT'))\n",
    "  BiocManager::install(c('fgsea','msigdbr'))",
    call. = FALSE
  )
}

suppressPackageStartupMessages({
  library(optparse)
  library(dplyr)
  library(data.table)
  library(fgsea)
  library(msigdbr)
  library(ggplot2)
  library(plotly)
  library(htmltools)
  library(htmlwidgets)
  library(DT)
})

# ---------------------------------------------------------------------------
# Command-line arguments
# ---------------------------------------------------------------------------
option_list <- list(
  make_option(c("-i", "--input"), type = "character", default = NULL,
              help = "Input directory (DEGs report directory with result files)",
              metavar = "DIR"),
  make_option(c("-o", "--output"), type = "character", default = NULL,
              help = "Output directory", metavar = "DIR"),
  make_option("--organism", type = "character", default = "hsa",
              help = "Organism code: hsa (human), mmu (mouse), rno (rat) [default %default]"),
  make_option("--p-cutoff", type = "numeric", default = 0.05,
              help = "Adjusted p-value cutoff [default %default]"),
  make_option("--min-size", type = "integer", default = 15L,
              help = "Minimum gene-set size for fgsea [default %default]"),
  make_option("--max-size", type = "integer", default = 500L,
              help = "Maximum gene-set size for fgsea [default %default]")
)

opt_parser <- OptionParser(option_list = option_list)
opt <- parse_args(opt_parser)

if (is.null(opt$input) || !dir.exists(opt$input)) {
  print_help(opt_parser)
  stop("A valid input directory (-i) is required.", call. = FALSE)
}
if (is.null(opt$output)) {
  print_help(opt_parser)
  stop("An output directory (-o) is required.", call. = FALSE)
}

organism_code <- opt$organism
p_cutoff      <- opt[["p-cutoff"]]
min_size      <- opt[["min-size"]]
max_size      <- opt[["max-size"]]
input_dir     <- opt$input
output_dir    <- opt$output

# Map organism codes to msigdbr species names
species_map <- c(
  hsa = "Homo sapiens",
  mmu = "Mus musculus",
  rno = "Rattus norvegicus"
)
if (!(organism_code %in% names(species_map))) {
  stop("Unsupported organism: ", organism_code,
       ". Supported values: ", paste(names(species_map), collapse = ", "), call. = FALSE)
}
species_name <- species_map[[organism_code]]

dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)

# ---------------------------------------------------------------------------
# 1. Load DEGs results and build ranked gene list
# ---------------------------------------------------------------------------
cat("Loading DEGs results from:", input_dir, "\n")

# Load the analysis.RData which contains meta, source.data, contrasts.list
data_file <- file.path(input_dir, "data", "analysis.RData")
if (!file.exists(data_file)) {
  stop("Cannot find analysis data file: ", data_file, call. = FALSE)
}
load(data_file, envir = globalenv())

# Find contrast TSV files
list_dir <- file.path(input_dir, "lists")
if (!dir.exists(list_dir)) {
  stop("Cannot find DEGs lists directory: ", list_dir, call. = FALSE)
}

contrast_files <- list.files(list_dir, pattern = "^metaseqr_all_out_.*\\.txt\\.gz$",
                             full.names = TRUE)
if (length(contrast_files) == 0) {
  stop("No DEGs result files found in: ", list_dir, call. = FALSE)
}

# Extract contrast names
contrast_names <- sub("^metaseqr_all_out_", "",
                      sub("\\.txt\\.gz$", "", basename(contrast_files)))

cat("Found", length(contrast_names), "contrast(s):", paste(contrast_names, collapse = ", "), "\n")

# ---------------------------------------------------------------------------
# 2. Load gene sets from MSigDB
# ---------------------------------------------------------------------------
cat("Loading gene sets from MSigDB for", species_name, "...\n")

# Hallmark gene sets (category H)
hallmark_sets <- tryCatch(
  msigdbr(species = species_name, category = "H") %>%
    split(x = .$entrez_gene, f = .$gs_name) %>%
    lapply(as.character),
  error = function(e) { cat("Warning: Could not load Hallmark gene sets:", e$message, "\n"); list() }
)

# KEGG pathways (C2, subcategory CP:KEGG)
kegg_sets <- tryCatch(
  msigdbr(species = species_name, category = "C2", subcategory = "CP:KEGG") %>%
    split(x = .$entrez_gene, f = .$gs_name) %>%
    lapply(as.character),
  error = function(e) { cat("Warning: Could not load KEGG gene sets:", e$message, "\n"); list() }
)

# GO Biological Process (C5, subcategory GO:BP)
gobp_sets <- tryCatch(
  msigdbr(species = species_name, category = "C5", subcategory = "GO:BP") %>%
    split(x = .$entrez_gene, f = .$gs_name) %>%
    lapply(as.character),
  error = function(e) { cat("Warning: Could not load GO BP gene sets:", e$message, "\n"); list() }
)

gene_set_collections <- list(
  Hallmark = hallmark_sets,
  KEGG     = kegg_sets,
  GO_BP    = gobp_sets
)
gene_set_collections <- Filter(function(x) length(x) > 0, gene_set_collections)

if (length(gene_set_collections) == 0) {
  stop("No gene set collections could be loaded. Check msigdbr installation.", call. = FALSE)
}
cat("Loaded gene set collections:",
    paste(names(gene_set_collections), "(", sapply(gene_set_collections, length), "sets)", collapse = ", "),
    "\n")

# ---------------------------------------------------------------------------
# 3. Run fgsea for each contrast and each gene set collection
# ---------------------------------------------------------------------------
all_results <- list()

for (ci in seq_along(contrast_files)) {
  con_name <- contrast_names[ci]
  cat("\nProcessing contrast:", con_name, "\n")

  con_table <- tryCatch(
    read.table(contrast_files[ci], sep = "\t", header = TRUE, stringsAsFactors = FALSE),
    error = function(e) { cat("  Error reading file:", e$message, "\n"); NULL }
  )
  if (is.null(con_table)) next

  # Find log2FC and p-value columns
  lfc_col <- grep("^log2_normalized_fold_change", colnames(con_table), value = TRUE)
  pval_col <- grep("^meta_p_value|^p_value|pvalue", colnames(con_table), value = TRUE, ignore.case = TRUE)

  if (length(lfc_col) == 0) {
    cat("  Warning: No log2FC column found, skipping contrast.\n")
    next
  }
  lfc_col <- lfc_col[1]

  # Try to get p-values; fall back to FDR columns if needed
  if (length(pval_col) == 0) {
    pval_col <- grep("fdr|padj|p.adjust", colnames(con_table), value = TRUE, ignore.case = TRUE)
  }
  if (length(pval_col) == 0) {
    cat("  Warning: No p-value column found, using LFC-only ranking.\n")
    pval_col <- NULL
  } else {
    pval_col <- pval_col[1]
  }

  # Map gene IDs to Entrez IDs via source.data
  gene_ids <- con_table$gene_id
  mapped <- source.data$mapped_id[match(gene_ids, source.data$id)]
  lfc_vals <- con_table[[lfc_col]]

  if (!is.null(pval_col)) {
    pvals <- con_table[[pval_col]]
    pvals[is.na(pvals)] <- 1
    pvals[pvals == 0] <- .Machine$double.xmin  # avoid -log10(0) = Inf
    # Rank: -log10(pvalue) * sign(log2FC)
    rank_vals <- -log10(pvals) * sign(lfc_vals)
  } else {
    rank_vals <- lfc_vals
  }

  # Build named vector, remove NAs and duplicates (keep max abs rank)
  names(rank_vals) <- as.character(mapped)
  rank_vals <- rank_vals[!is.na(names(rank_vals)) & names(rank_vals) != ""]

  # For duplicate Entrez IDs, keep the one with largest absolute rank
  if (any(duplicated(names(rank_vals)))) {
    dt <- data.table(entrez = names(rank_vals), rank = rank_vals)
    dt <- dt[, .(rank = rank[which.max(abs(rank))]), by = entrez]
    rank_vals <- setNames(dt$rank, dt$entrez)
  }

  rank_vals <- sort(rank_vals, decreasing = TRUE)
  cat("  Ranked gene list:", length(rank_vals), "genes\n")

  for (coll_name in names(gene_set_collections)) {
    gene_sets <- gene_set_collections[[coll_name]]
    cat("  Running fgsea for", coll_name, "(", length(gene_sets), "sets) ...\n")

    fgsea_res <- tryCatch(
      fgsea(pathways = gene_sets,
            stats    = rank_vals,
            minSize  = min_size,
            maxSize  = max_size),
      error = function(e) { cat("    fgsea error:", e$message, "\n"); NULL }
    )

    if (!is.null(fgsea_res) && nrow(fgsea_res) > 0) {
      fgsea_res$contrast   <- con_name
      fgsea_res$collection <- coll_name
      # Convert leadingEdge list-column to a character representation for TSV
      fgsea_res$leadingEdgeSize <- sapply(fgsea_res$leadingEdge, length)
      all_results[[paste0(con_name, "_", coll_name)]] <- fgsea_res
      sig_count <- sum(fgsea_res$padj < p_cutoff, na.rm = TRUE)
      cat("    Found", sig_count, "significant pathways (padj <", p_cutoff, ")\n")
    }
  }
}

if (length(all_results) == 0) {
  cat("No GSEA results were produced. Exiting.\n")
  # Write empty results file
  writeLines("No significant GSEA results.", file.path(output_dir, "gsea_results.tsv"))
  quit(status = 0)
}

# Combine all results
combined <- rbindlist(all_results, fill = TRUE)
# Convert leadingEdge to semicolon-separated string for TSV output
combined$leadingEdgeStr <- sapply(combined$leadingEdge, function(x) paste(x, collapse = ";"))

# ---------------------------------------------------------------------------
# 4. Write results TSV
# ---------------------------------------------------------------------------
results_tsv <- file.path(output_dir, "gsea_results.tsv")
tsv_out <- combined[, .(contrast, collection, pathway, pval, padj, log2err, ES, NES, size, leadingEdgeSize, leadingEdgeStr)]
fwrite(tsv_out, file = results_tsv, sep = "\t")
cat("\nResults written to:", results_tsv, "\n")

# ---------------------------------------------------------------------------
# 5. Generate HTML report
# ---------------------------------------------------------------------------
cat("Generating HTML report...\n")

report_dir <- file.path(output_dir, "gsea_report")
dir.create(report_dir, showWarnings = FALSE, recursive = TRUE)

# Helper: create a dot plot for top pathways
make_dotplot <- function(df, title_text, n = 20) {
  if (nrow(df) == 0) return(NULL)

  # Separate up and down, take top from each
  up   <- df %>% filter(NES > 0) %>% arrange(padj) %>% head(n)
  down <- df %>% filter(NES < 0) %>% arrange(padj) %>% head(n)
  top  <- bind_rows(up, down) %>% arrange(NES)

  if (nrow(top) == 0) return(NULL)

  top$pathway_short <- substr(top$pathway, 1, 60)
  top$pathway_short <- factor(top$pathway_short, levels = top$pathway_short)
  top$direction <- ifelse(top$NES > 0, "Up", "Down")

  p <- ggplot(top, aes(x = NES, y = pathway_short, size = size, color = padj)) +
    geom_point() +
    scale_color_gradient(low = "red", high = "blue", name = "Adj. p-value") +
    scale_size_continuous(name = "Gene set size", range = c(2, 8)) +
    labs(title = title_text, x = "Normalized Enrichment Score (NES)", y = "") +
    theme_minimal(base_size = 11) +
    theme(axis.text.y = element_text(size = 8))

  tryCatch(ggplotly(p, tooltip = c("x", "size", "color")),
           error = function(e) p)
}

# Helper: create enrichment summary table
make_summary_table <- function(df, n = 20) {
  if (nrow(df) == 0) return(NULL)

  top <- df %>% arrange(padj) %>% head(n) %>%
    select(pathway, NES, pval, padj, size, leadingEdgeSize) %>%
    mutate(
      NES  = round(NES, 3),
      pval = signif(pval, 3),
      padj = signif(padj, 3)
    )
  colnames(top) <- c("Pathway", "NES", "P-value", "Adj. P-value", "Set Size", "Leading Edge")

  datatable(top, rownames = FALSE, filter = "top",
            options = list(pageLength = 20, scrollX = TRUE, dom = "ftip"),
            class = "display compact stripe")
}

# Build HTML content per contrast
html_sections <- list()

for (con_name in unique(combined$contrast)) {
  con_data <- combined[contrast == con_name]
  con_display <- gsub("_vs_", " vs ", con_name)

  section_parts <- list(
    tags$h2(paste("Contrast:", con_display))
  )

  for (coll_name in unique(con_data$collection)) {
    coll_data <- as.data.frame(con_data[collection == coll_name])

    section_parts <- c(section_parts, list(
      tags$h3(coll_name)
    ))

    # Dot plot
    dp <- make_dotplot(coll_data, paste(coll_name, "-", con_display))
    if (!is.null(dp)) {
      # Save plotly widget to temp file and embed
      widget_file <- file.path(report_dir,
                               paste0("dotplot_", con_name, "_", coll_name, ".html"))
      saveWidget(dp, widget_file, selfcontained = TRUE)
      section_parts <- c(section_parts, list(
        tags$h4("Top Enriched Pathways"),
        tags$iframe(src = basename(widget_file), width = "100%", height = "600px",
                    style = "border: none;")
      ))
    }

    # Summary table
    st <- make_summary_table(coll_data)
    if (!is.null(st)) {
      table_file <- file.path(report_dir,
                              paste0("table_", con_name, "_", coll_name, ".html"))
      saveWidget(st, table_file, selfcontained = TRUE)
      section_parts <- c(section_parts, list(
        tags$h4("Results Summary"),
        tags$iframe(src = basename(table_file), width = "100%", height = "500px",
                    style = "border: none;")
      ))
    }

    # Counts summary
    sig_up   <- sum(coll_data$NES > 0 & coll_data$padj < p_cutoff, na.rm = TRUE)
    sig_down <- sum(coll_data$NES < 0 & coll_data$padj < p_cutoff, na.rm = TRUE)
    section_parts <- c(section_parts, list(
      tags$p(paste0("Significant (padj < ", p_cutoff, "): ",
                    sig_up, " up-regulated, ", sig_down, " down-regulated, ",
                    sig_up + sig_down, " total out of ", nrow(coll_data), " tested gene sets."))
    ))
  }

  html_sections <- c(html_sections, section_parts, list(tags$hr()))
}

# Assemble full HTML page
full_page <- tags$html(
  tags$head(
    tags$meta(charset = "utf-8"),
    tags$title("GSEA Report (fgsea)"),
    tags$style(HTML("
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
             margin: 30px auto; max-width: 1200px; padding: 0 20px;
             color: #333; line-height: 1.6; }
      h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
      h2 { color: #2c3e50; margin-top: 30px; }
      h3 { color: #34495e; }
      h4 { color: #555; }
      hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
      .meta { color: #777; font-size: 0.9em; margin-bottom: 20px; }
      iframe { margin: 10px 0; }
    "))
  ),
  tags$body(
    tags$h1("Gene Set Enrichment Analysis Report"),
    tags$p(class = "meta",
           paste("Generated:", format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
                 "| Organism:", species_name,
                 "| P-value cutoff:", p_cutoff,
                 "| Gene set size:", min_size, "-", max_size)),
    tags$p(paste("Analysis performed using fgsea with gene sets from MSigDB (via msigdbr).",
                 "Collections tested: Hallmark, KEGG, GO Biological Process.")),
    tagList(html_sections)
  )
)

index_file <- file.path(report_dir, "index.html")
save_html(full_page, file = index_file)
cat("HTML report written to:", index_file, "\n")
cat("GSEA analysis complete.\n")
