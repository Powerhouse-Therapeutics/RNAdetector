#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(optparse)
  library(plotly)
  library(htmlwidgets)
})

option_list <- list(
  make_option(c("-i", "--input"), type = "character", default = NULL,
              help = "Input counts matrix TSV (genes as rows, samples as columns)", metavar = "PATH"),
  make_option(c("-m", "--metadata"), type = "character", default = NULL,
              help = "Metadata TSV with sample info (must have a 'condition' column)", metavar = "PATH"),
  make_option(c("-o", "--output"), type = "character", default = NULL,
              help = "Output directory for HTML plots", metavar = "PATH")
)

opt_parser <- OptionParser(option_list = option_list)
opt <- parse_args(opt_parser)

if (is.null(opt$input) || is.null(opt$output)) {
  print_help(opt_parser)
  stop("Both --input and --output are required.", call. = FALSE)
}

input_file <- opt$input
metadata_file <- opt$metadata
output_dir <- opt$output

if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

if (!file.exists(input_file)) {
  stop("Input file not found: ", input_file, call. = FALSE)
}

# Read counts matrix
cat("Reading counts matrix:", input_file, "\n")
counts <- read.delim(input_file, header = TRUE, row.names = 1, stringsAsFactors = FALSE,
                     check.names = FALSE, sep = "\t")

# If read as CSV fallback
if (ncol(counts) < 2) {
  counts <- read.csv(input_file, header = TRUE, row.names = 1, stringsAsFactors = FALSE,
                     check.names = FALSE)
}

cat("Loaded counts matrix:", nrow(counts), "genes x", ncol(counts), "samples.\n")

# Read metadata if provided
conditions <- NULL
if (!is.null(metadata_file) && file.exists(metadata_file)) {
  cat("Reading metadata:", metadata_file, "\n")
  meta <- read.delim(metadata_file, header = TRUE, stringsAsFactors = FALSE, check.names = FALSE)

  # Find condition column
  cond_col <- NULL
  for (candidate in c("condition", "Condition", "group", "Group", "treatment", "Treatment", "class", "Class")) {
    if (candidate %in% colnames(meta)) {
      cond_col <- candidate
      break
    }
  }

  if (!is.null(cond_col)) {
    # Try to match sample names
    sample_col <- NULL
    for (candidate in c("sample", "Sample", "sample_id", "SampleID", "name", "Name")) {
      if (candidate %in% colnames(meta)) {
        sample_col <- candidate
        break
      }
    }
    if (is.null(sample_col)) {
      # Use first column or rownames
      if (!is.null(rownames(meta)) && !all(rownames(meta) == as.character(seq_len(nrow(meta))))) {
        meta$sample_name <- rownames(meta)
        sample_col <- "sample_name"
      } else {
        sample_col <- colnames(meta)[1]
      }
    }

    # Match metadata to counts columns
    matched <- match(colnames(counts), meta[[sample_col]])
    if (sum(!is.na(matched)) > 0) {
      conditions <- meta[[cond_col]][matched]
      conditions[is.na(conditions)] <- "Unknown"
      cat("Matched", sum(!is.na(matched)), "samples to metadata conditions.\n")
    } else {
      cat("Warning: Could not match sample names between counts and metadata.\n")
    }
  } else {
    cat("Warning: No condition column found in metadata.\n")
  }
}

if (is.null(conditions)) {
  conditions <- rep("Sample", ncol(counts))
}

# Filter low-count genes
counts_numeric <- as.matrix(counts)
storage.mode(counts_numeric) <- "numeric"
counts_numeric[is.na(counts_numeric)] <- 0

# Remove genes with very low counts
keep <- rowSums(counts_numeric > 1) >= 2
if (sum(keep) < 10) {
  keep <- rowSums(counts_numeric > 0) >= 1
}
counts_filtered <- counts_numeric[keep, , drop = FALSE]
cat("Kept", nrow(counts_filtered), "genes after filtering.\n")

# Variance stabilizing transform using log2(count + 1) as a simple approach
# (avoids hard DESeq2 dependency)
use_deseq2 <- FALSE
tryCatch({
  suppressPackageStartupMessages(library(DESeq2))
  use_deseq2 <- TRUE
}, error = function(e) {
  cat("DESeq2 not available; using log2(count+1) transform.\n")
})

if (use_deseq2 && ncol(counts_filtered) >= 2) {
  tryCatch({
    col_data <- data.frame(condition = factor(conditions), row.names = colnames(counts_filtered))
    dds <- DESeqDataSetFromMatrix(countData = round(counts_filtered),
                                   colData = col_data,
                                   design = ~ 1)
    vsd <- varianceStabilizingTransformation(dds, blind = TRUE)
    transformed <- assay(vsd)
    cat("Applied DESeq2 variance stabilizing transformation.\n")
  }, error = function(e) {
    cat("DESeq2 VST failed, falling back to log2(count+1):", e$message, "\n")
    transformed <- log2(counts_filtered + 1)
  })
} else {
  transformed <- log2(counts_filtered + 1)
}

# ---- PCA Plot ----
cat("Computing PCA...\n")

# Remove zero-variance genes
gene_vars <- apply(transformed, 1, var, na.rm = TRUE)
transformed <- transformed[gene_vars > 0, , drop = FALSE]

if (nrow(transformed) < 2 || ncol(transformed) < 2) {
  stop("Not enough data for PCA after filtering.", call. = FALSE)
}

pca_result <- prcomp(t(transformed), center = TRUE, scale. = TRUE)

# Variance explained
var_explained <- (pca_result$sdev^2 / sum(pca_result$sdev^2)) * 100
pc1_var <- round(var_explained[1], 1)
pc2_var <- round(var_explained[2], 1)

sample_names <- colnames(counts_filtered)

pca_data <- data.frame(
  PC1 = pca_result$x[, 1],
  PC2 = pca_result$x[, 2],
  Sample = sample_names,
  Condition = conditions,
  stringsAsFactors = FALSE
)

pca_hover <- paste0(
  "<b>", pca_data$Sample, "</b><br>",
  "Condition: ", pca_data$Condition, "<br>",
  "PC1: ", round(pca_data$PC1, 2), "<br>",
  "PC2: ", round(pca_data$PC2, 2)
)

pca_plot <- plot_ly(
  data = pca_data,
  x = ~PC1,
  y = ~PC2,
  color = ~Condition,
  type = "scatter",
  mode = "markers",
  marker = list(size = 10, opacity = 0.8, line = list(width = 1, color = "rgba(255,255,255,0.3)")),
  text = pca_hover,
  hoverinfo = "text"
) %>%
  layout(
    title = list(
      text = "PCA Plot",
      font = list(color = "#C9D1D9", size = 16)
    ),
    xaxis = list(
      title = paste0("PC1 (", pc1_var, "% variance)"),
      zeroline = TRUE,
      zerolinecolor = "rgba(139, 148, 158, 0.3)",
      gridcolor = "rgba(139, 148, 158, 0.1)",
      color = "#8B949E"
    ),
    yaxis = list(
      title = paste0("PC2 (", pc2_var, "% variance)"),
      zeroline = TRUE,
      zerolinecolor = "rgba(139, 148, 158, 0.3)",
      gridcolor = "rgba(139, 148, 158, 0.1)",
      color = "#8B949E"
    ),
    plot_bgcolor = "#0D1117",
    paper_bgcolor = "#161B22",
    font = list(color = "#C9D1D9"),
    legend = list(
      font = list(color = "#C9D1D9"),
      bgcolor = "rgba(22, 27, 34, 0.8)"
    )
  )

pca_file <- file.path(output_dir, "pca_plot.html")
saveWidget(as_widget(pca_plot), pca_file, selfcontained = TRUE)
cat("PCA plot saved to:", pca_file, "\n")

# ---- Correlation Heatmap ----
cat("Computing sample correlation heatmap...\n")

cor_matrix <- cor(transformed, method = "spearman", use = "pairwise.complete.obs")

# Build heatmap
heatmap_plot <- plot_ly(
  x = colnames(cor_matrix),
  y = rownames(cor_matrix),
  z = cor_matrix,
  type = "heatmap",
  colorscale = list(
    list(0, "#3498DB"),
    list(0.5, "#0D1117"),
    list(1, "#E74C3C")
  ),
  zmin = min(cor_matrix, na.rm = TRUE),
  zmax = 1,
  hovertemplate = "Sample X: %{x}<br>Sample Y: %{y}<br>Correlation: %{z:.3f}<extra></extra>"
) %>%
  layout(
    title = list(
      text = "Sample-Sample Correlation (Spearman)",
      font = list(color = "#C9D1D9", size = 16)
    ),
    xaxis = list(
      color = "#8B949E",
      tickangle = -45
    ),
    yaxis = list(
      color = "#8B949E",
      autorange = "reversed"
    ),
    plot_bgcolor = "#0D1117",
    paper_bgcolor = "#161B22",
    font = list(color = "#C9D1D9")
  )

heatmap_file <- file.path(output_dir, "correlation_heatmap.html")
saveWidget(as_widget(heatmap_plot), heatmap_file, selfcontained = TRUE)
cat("Correlation heatmap saved to:", heatmap_file, "\n")

cat("PCA visualization generation complete.\n")
