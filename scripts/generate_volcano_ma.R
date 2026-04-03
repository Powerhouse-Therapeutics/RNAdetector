#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(optparse)
  library(plotly)
  library(htmlwidgets)
})

option_list <- list(
  make_option(c("-i", "--input"), type = "character", default = NULL,
              help = "Input DEGs result directory or TSV file", metavar = "PATH"),
  make_option(c("-o", "--output"), type = "character", default = NULL,
              help = "Output directory for HTML plots", metavar = "PATH")
)

opt_parser <- OptionParser(option_list = option_list)
opt <- parse_args(opt_parser)

if (is.null(opt$input) || is.null(opt$output)) {
  print_help(opt_parser)
  stop("Both --input and --output are required.", call. = FALSE)
}

input_path <- opt$input
output_dir <- opt$output

if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

# Find the DEGs result TSV file
find_deg_file <- function(path) {
  if (file.exists(path) && !dir.info(path)$isdir) {
    return(path)
  }
  # Look for TSV files in the directory
  candidates <- list.files(path, pattern = "\\.(tsv|txt|csv)$", full.names = TRUE, recursive = TRUE)
  # Prefer files with "DEG" or "result" in the name
  deg_files <- candidates[grepl("(DEG|deg|result|differential|DE_)", basename(candidates), ignore.case = TRUE)]
  if (length(deg_files) > 0) return(deg_files[1])
  # Fall back to any TSV
  tsv_files <- candidates[grepl("\\.tsv$", candidates)]
  if (length(tsv_files) > 0) return(tsv_files[1])
  if (length(candidates) > 0) return(candidates[1])
  return(NULL)
}

dir.info <- function(path) {
  fi <- file.info(path)
  return(fi)
}

deg_file <- find_deg_file(input_path)
if (is.null(deg_file)) {
  stop("No suitable DEGs result file found in: ", input_path, call. = FALSE)
}

cat("Reading DEGs file:", deg_file, "\n")

# Read the data - try different separators
tryCatch({
  data <- read.delim(deg_file, header = TRUE, stringsAsFactors = FALSE, sep = "\t", check.names = FALSE)
  if (ncol(data) < 2) {
    data <- read.csv(deg_file, header = TRUE, stringsAsFactors = FALSE, check.names = FALSE)
  }
}, error = function(e) {
  stop("Failed to read input file: ", e$message, call. = FALSE)
})

cat("Loaded", nrow(data), "rows and", ncol(data), "columns.\n")
cat("Columns:", paste(colnames(data), collapse = ", "), "\n")

# Identify columns - be flexible with naming
find_col <- function(df, patterns, required = FALSE) {
  cols <- colnames(df)
  for (pat in patterns) {
    matches <- grep(pat, cols, ignore.case = TRUE, value = TRUE)
    if (length(matches) > 0) return(matches[1])
  }
  if (required) stop("Required column not found. Tried patterns: ", paste(patterns, collapse = ", "), call. = FALSE)
  return(NULL)
}

gene_col <- find_col(data, c("^Gene\\.Id$", "^gene_id$", "^GeneID$", "^gene$", "^Gene$", "^ID$", "^id$", "^Symbol$", "^gene_name$"))
lfc_col <- find_col(data, c("^log2FC$", "^log2FoldChange$", "^logFC$", "^lfc$", "^Log2FC$"), required = TRUE)
padj_col <- find_col(data, c("^padj$", "^adj\\.P\\.Val$", "^FDR$", "^fdr$", "^q\\.value$", "^qvalue$", "^adjusted\\.p\\.value$"))
pval_col <- find_col(data, c("^pvalue$", "^PValue$", "^p\\.value$", "^P\\.Value$", "^pval$"))
mean_col <- find_col(data, c("^baseMean$", "^AveExpr$", "^logCPM$", "^mean$", "^AvgExpr$", "^meanExpr$"))

# Use padj if available, otherwise pvalue
sig_col <- if (!is.null(padj_col)) padj_col else pval_col
if (is.null(sig_col)) {
  stop("No p-value or adjusted p-value column found.", call. = FALSE)
}

cat("Using columns - LFC:", lfc_col, " Significance:", sig_col, "\n")
if (!is.null(gene_col)) cat("Gene ID column:", gene_col, "\n")
if (!is.null(mean_col)) cat("Mean expression column:", mean_col, "\n")

# Clean data
lfc_vals <- as.numeric(data[[lfc_col]])
sig_vals <- as.numeric(data[[sig_col]])

# Replace 0 p-values with smallest non-zero value
min_nonzero_sig <- min(sig_vals[sig_vals > 0 & !is.na(sig_vals)], na.rm = TRUE)
sig_vals[sig_vals == 0 | is.na(sig_vals)] <- min_nonzero_sig

neg_log10_sig <- -log10(sig_vals)

# Gene names for hover
if (!is.null(gene_col)) {
  gene_names <- as.character(data[[gene_col]])
} else {
  gene_names <- paste0("Gene_", seq_len(nrow(data)))
}

# Classify genes
lfc_threshold <- 1
sig_threshold <- 0.05

regulation <- rep("NS", length(lfc_vals))
regulation[!is.na(lfc_vals) & !is.na(sig_vals) & sig_vals < sig_threshold & lfc_vals > lfc_threshold] <- "Up"
regulation[!is.na(lfc_vals) & !is.na(sig_vals) & sig_vals < sig_threshold & lfc_vals < -lfc_threshold] <- "Down"

colors <- c("Up" = "#E74C3C", "Down" = "#3498DB", "NS" = "#95A5A6")

up_count <- sum(regulation == "Up", na.rm = TRUE)
down_count <- sum(regulation == "Down", na.rm = TRUE)
ns_count <- sum(regulation == "NS", na.rm = TRUE)

# Build hover text
hover_text <- paste0(
  "<b>", gene_names, "</b><br>",
  "log2FC: ", round(lfc_vals, 3), "<br>",
  sig_col, ": ", signif(sig_vals, 3), "<br>",
  "-log10(", sig_col, "): ", round(neg_log10_sig, 2)
)

# ---- Volcano Plot ----
cat("Generating volcano plot...\n")

plot_data <- data.frame(
  x = lfc_vals,
  y = neg_log10_sig,
  gene = gene_names,
  regulation = factor(regulation, levels = c("Up", "Down", "NS")),
  hover = hover_text,
  stringsAsFactors = FALSE
)
plot_data <- plot_data[!is.na(plot_data$x) & !is.na(plot_data$y), ]

volcano <- plot_ly(
  data = plot_data,
  x = ~x,
  y = ~y,
  color = ~regulation,
  colors = colors,
  type = "scatter",
  mode = "markers",
  marker = list(size = 5, opacity = 0.6),
  text = ~hover,
  hoverinfo = "text"
) %>%
  layout(
    title = list(
      text = paste0("Volcano Plot (Up: ", up_count, " | Down: ", down_count, " | NS: ", ns_count, ")"),
      font = list(color = "#C9D1D9", size = 16)
    ),
    xaxis = list(
      title = "log2 Fold Change",
      zeroline = TRUE,
      zerolinecolor = "rgba(139, 148, 158, 0.3)",
      gridcolor = "rgba(139, 148, 158, 0.1)",
      color = "#8B949E"
    ),
    yaxis = list(
      title = paste0("-log10(", sig_col, ")"),
      gridcolor = "rgba(139, 148, 158, 0.1)",
      color = "#8B949E"
    ),
    plot_bgcolor = "#0D1117",
    paper_bgcolor = "#161B22",
    font = list(color = "#C9D1D9"),
    legend = list(
      font = list(color = "#C9D1D9"),
      bgcolor = "rgba(22, 27, 34, 0.8)"
    ),
    shapes = list(
      # Horizontal line at significance threshold
      list(type = "line", x0 = min(plot_data$x, na.rm = TRUE), x1 = max(plot_data$x, na.rm = TRUE),
           y0 = -log10(sig_threshold), y1 = -log10(sig_threshold),
           line = list(color = "rgba(248, 81, 73, 0.4)", width = 1, dash = "dash")),
      # Vertical lines at LFC thresholds
      list(type = "line", x0 = lfc_threshold, x1 = lfc_threshold,
           y0 = 0, y1 = max(plot_data$y, na.rm = TRUE),
           line = list(color = "rgba(248, 81, 73, 0.4)", width = 1, dash = "dash")),
      list(type = "line", x0 = -lfc_threshold, x1 = -lfc_threshold,
           y0 = 0, y1 = max(plot_data$y, na.rm = TRUE),
           line = list(color = "rgba(248, 81, 73, 0.4)", width = 1, dash = "dash"))
    )
  )

volcano_file <- file.path(output_dir, "volcano_plot.html")
saveWidget(as_widget(volcano), volcano_file, selfcontained = TRUE)
cat("Volcano plot saved to:", volcano_file, "\n")

# ---- MA Plot ----
if (!is.null(mean_col)) {
  cat("Generating MA plot...\n")

  mean_vals <- as.numeric(data[[mean_col]])
  # Log2 transform if values appear to be on linear scale
  if (max(mean_vals, na.rm = TRUE) > 100) {
    log2_mean <- log2(mean_vals + 1)
    x_label <- "log2(Mean Expression + 1)"
  } else {
    log2_mean <- mean_vals
    x_label <- mean_col
  }

  ma_hover <- paste0(
    "<b>", gene_names, "</b><br>",
    x_label, ": ", round(log2_mean, 3), "<br>",
    "log2FC: ", round(lfc_vals, 3), "<br>",
    sig_col, ": ", signif(sig_vals, 3)
  )

  ma_data <- data.frame(
    x = log2_mean,
    y = lfc_vals,
    gene = gene_names,
    regulation = factor(regulation, levels = c("Up", "Down", "NS")),
    hover = ma_hover,
    stringsAsFactors = FALSE
  )
  ma_data <- ma_data[!is.na(ma_data$x) & !is.na(ma_data$y), ]

  ma_plot <- plot_ly(
    data = ma_data,
    x = ~x,
    y = ~y,
    color = ~regulation,
    colors = colors,
    type = "scatter",
    mode = "markers",
    marker = list(size = 5, opacity = 0.6),
    text = ~hover,
    hoverinfo = "text"
  ) %>%
    layout(
      title = list(
        text = paste0("MA Plot (Up: ", up_count, " | Down: ", down_count, " | NS: ", ns_count, ")"),
        font = list(color = "#C9D1D9", size = 16)
      ),
      xaxis = list(
        title = x_label,
        gridcolor = "rgba(139, 148, 158, 0.1)",
        color = "#8B949E"
      ),
      yaxis = list(
        title = "log2 Fold Change",
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
      ),
      shapes = list(
        # Horizontal line at 0
        list(type = "line", x0 = min(ma_data$x, na.rm = TRUE), x1 = max(ma_data$x, na.rm = TRUE),
             y0 = 0, y1 = 0,
             line = list(color = "rgba(139, 148, 158, 0.4)", width = 1, dash = "dash")),
        # Horizontal lines at LFC thresholds
        list(type = "line", x0 = min(ma_data$x, na.rm = TRUE), x1 = max(ma_data$x, na.rm = TRUE),
             y0 = lfc_threshold, y1 = lfc_threshold,
             line = list(color = "rgba(248, 81, 73, 0.3)", width = 1, dash = "dot")),
        list(type = "line", x0 = min(ma_data$x, na.rm = TRUE), x1 = max(ma_data$x, na.rm = TRUE),
             y0 = -lfc_threshold, y1 = -lfc_threshold,
             line = list(color = "rgba(248, 81, 73, 0.3)", width = 1, dash = "dot"))
      )
    )

  ma_file <- file.path(output_dir, "ma_plot.html")
  saveWidget(as_widget(ma_plot), ma_file, selfcontained = TRUE)
  cat("MA plot saved to:", ma_file, "\n")
} else {
  cat("No mean expression column found; skipping MA plot.\n")
}

cat("Visualization generation complete.\n")
