#!/usr/bin/env Rscript
# =============================================================================
# RNAdetector Report Generator
# Generates a self-contained HTML report for RNA-seq analysis jobs.
# =============================================================================

suppressPackageStartupMessages({
  library(optparse)
  library(jsonlite)
})

# ---------------------------------------------------------------------------
# CLI arguments
# ---------------------------------------------------------------------------
option_list <- list(
  make_option(c("-j", "--job_id"),    type = "character", default = NULL,
              help = "Job ID",                              metavar = "ID"),
  make_option(c("-t", "--job_type"),  type = "character", default = "rnaseq",
              help = "Job type (rnaseq, dge, smallrna, circrna)", metavar = "TYPE"),
  make_option(c("-n", "--job_name"),  type = "character", default = "Untitled Analysis",
              help = "Human-readable job name",             metavar = "NAME"),
  make_option(c("-o", "--output_dir"), type = "character", default = NULL,
              help = "Output directory for report.html",    metavar = "DIR"),
  make_option(c("-g", "--group_colors"), type = "character", default = "{}",
              help = "JSON string mapping group names to colours", metavar = "JSON")
)

opt_parser <- OptionParser(option_list = option_list)
opt        <- parse_args(opt_parser)

if (is.null(opt$output_dir)) {
  stop("--output_dir is required.", call. = FALSE)
}
if (is.null(opt$job_id)) {
  opt$job_id <- "unknown"
}

output_dir   <- sub("/+$", "", opt$output_dir)
job_id       <- opt$job_id
job_type     <- opt$job_type
job_name     <- opt$job_name
group_colors <- tryCatch(fromJSON(opt$group_colors), error = function(e) list())

dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

# ---------------------------------------------------------------------------
# Helper: encode a local image file as a base64 data-URI
# ---------------------------------------------------------------------------
img_to_base64 <- function(path) {
  if (!file.exists(path)) return(NULL)
  ext <- tolower(tools::file_ext(path))
  mime <- switch(ext,
    png  = "image/png",
    jpg  = "image/jpeg",
    jpeg = "image/jpeg",
    svg  = "image/svg+xml",
    pdf  = "application/pdf",
    "application/octet-stream"
  )
  raw <- readBin(path, "raw", file.info(path)$size)
  encoded <- base64enc::base64encode(raw)
  paste0("data:", mime, ";base64,", encoded)
}

# Try to load base64enc; if missing, define a minimal encoder
if (!requireNamespace("base64enc", quietly = TRUE)) {
  img_to_base64 <- function(path) {
    if (!file.exists(path)) return(NULL)
    ext <- tolower(tools::file_ext(path))
    mime <- switch(ext, png = "image/png", jpg = "image/jpeg",
                   jpeg = "image/jpeg", svg = "image/svg+xml",
                   "application/octet-stream")
    encoded <- system2("base64", args = c("-w", "0", path), stdout = TRUE)
    paste0("data:", mime, ";base64,", paste(encoded, collapse = ""))
  }
}

# ---------------------------------------------------------------------------
# Helper: HTML-escape
# ---------------------------------------------------------------------------
html_esc <- function(x) {
  x <- gsub("&", "&amp;", x, fixed = TRUE)
  x <- gsub("<", "&lt;",  x, fixed = TRUE)
  x <- gsub(">", "&gt;",  x, fixed = TRUE)
  x
}

# ---------------------------------------------------------------------------
# Discover available figures in output_dir
# ---------------------------------------------------------------------------
figure_exts  <- c("png", "jpg", "jpeg", "svg")
figure_files <- list.files(output_dir, pattern = paste0("\\.(", paste(figure_exts, collapse = "|"), ")$"),
                           full.names = TRUE, recursive = TRUE, ignore.case = TRUE)

# ---------------------------------------------------------------------------
# Discover summary / stats files
# ---------------------------------------------------------------------------
find_file <- function(patterns) {
  for (pat in patterns) {
    hits <- list.files(output_dir, pattern = pat, full.names = TRUE, recursive = TRUE, ignore.case = TRUE)
    if (length(hits) > 0) return(hits[1])
  }
  return(NULL)
}

alignment_stats_file <- find_file(c("alignment_stats\\.tsv", "mapping_stats", "star_log", "hisat.*summary"))
count_matrix_file    <- find_file(c("counts\\.tsv", "count_matrix", "featureCounts", "salmon.*quant"))
de_results_file      <- find_file(c("de_results\\.tsv", "DESeq2.*results", "edgeR.*results", "limma.*results"))
pathway_file         <- find_file(c("pathway.*\\.tsv", "enrichment.*\\.tsv", "gsea.*\\.tsv", "kegg.*\\.tsv"))

# ---------------------------------------------------------------------------
# Build sections
# ---------------------------------------------------------------------------
timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z")

sections <- list()  # list of list(id, title, html)

# --- Summary ---------------------------------------------------------------
summary_html <- paste0(
  '<div class="card">',
  '<table class="summary-table">',
  '<tr><th>Job ID</th><td>', html_esc(job_id), '</td></tr>',
  '<tr><th>Job Name</th><td>', html_esc(job_name), '</td></tr>',
  '<tr><th>Analysis Type</th><td>', html_esc(toupper(job_type)), '</td></tr>',
  '<tr><th>Report Generated</th><td>', html_esc(timestamp), '</td></tr>',
  '<tr><th>Output Directory</th><td><code>', html_esc(output_dir), '</code></td></tr>',
  '</table></div>'
)

# If a counts matrix exists, show dimensions
if (!is.null(count_matrix_file)) {
  tryCatch({
    mat <- read.delim(count_matrix_file, nrows = 5, header = TRUE, check.names = FALSE)
    full <- read.delim(count_matrix_file, header = TRUE, check.names = FALSE)
    summary_html <- paste0(summary_html,
      '<div class="card"><h3>Count Matrix Overview</h3>',
      '<p>Features: <strong>', nrow(full), '</strong> | Samples: <strong>', ncol(full) - 1, '</strong></p>',
      '<p>Source: <code>', html_esc(basename(count_matrix_file)), '</code></p>',
      '</div>')
  }, error = function(e) NULL)
}

sections <- c(sections, list(list(id = "summary", title = "Summary", html = summary_html)))

# --- Quality Control -------------------------------------------------------
qc_html <- '<div class="card"><p>Quality control metrics from FastQC / MultiQC will appear here when available.</p>'
qc_figs <- grep("qc|fastqc|multiqc|quality", figure_files, ignore.case = TRUE, value = TRUE)
if (length(qc_figs) > 0) {
  for (f in qc_figs) {
    uri <- img_to_base64(f)
    if (!is.null(uri)) {
      qc_html <- paste0(qc_html,
        '<div class="figure-block">',
        '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
        '<p class="figure-caption">', html_esc(basename(f)), '</p>',
        '</div>')
    }
  }
} else {
  qc_html <- paste0(qc_html,
    '<p class="placeholder">No QC figures detected. Run FastQC/MultiQC to populate this section.</p>')
}
qc_html <- paste0(qc_html, '</div>')
sections <- c(sections, list(list(id = "qc", title = "Quality Control", html = qc_html)))

# --- Alignment Statistics ---------------------------------------------------
aln_html <- '<div class="card">'
if (!is.null(alignment_stats_file)) {
  tryCatch({
    aln <- read.delim(alignment_stats_file, header = TRUE, check.names = FALSE)
    aln_html <- paste0(aln_html,
      '<h3>Alignment Summary</h3>',
      '<p>Source: <code>', html_esc(basename(alignment_stats_file)), '</code></p>',
      '<div class="table-wrapper"><table class="data-table sortable">',
      '<thead><tr>', paste0('<th>', html_esc(colnames(aln)), '</th>', collapse = ""), '</tr></thead>',
      '<tbody>')
    for (i in seq_len(min(nrow(aln), 200))) {
      aln_html <- paste0(aln_html, '<tr>',
        paste0('<td>', html_esc(as.character(aln[i, ])), '</td>', collapse = ""),
        '</tr>')
    }
    aln_html <- paste0(aln_html, '</tbody></table></div>')
  }, error = function(e) {
    aln_html <<- paste0(aln_html,
      '<p class="placeholder">Could not parse alignment stats file: ', html_esc(conditionMessage(e)), '</p>')
  })
} else {
  aln_html <- paste0(aln_html,
    '<p class="placeholder">No alignment statistics file found. This section will be populated after alignment.</p>')
}
aln_figs <- grep("align|mapping|star|hisat", figure_files, ignore.case = TRUE, value = TRUE)
for (f in aln_figs) {
  uri <- img_to_base64(f)
  if (!is.null(uri)) {
    aln_html <- paste0(aln_html,
      '<div class="figure-block">',
      '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
      '<p class="figure-caption">', html_esc(basename(f)), '</p>',
      '</div>')
  }
}
aln_html <- paste0(aln_html, '</div>')
sections <- c(sections, list(list(id = "alignment", title = "Alignment Statistics", html = aln_html)))

# --- Expression Analysis ---------------------------------------------------
expr_html <- '<div class="card">'
expr_figs <- grep("pca|mds|heatmap|boxplot|density|dispersion|expression|norm", figure_files,
                  ignore.case = TRUE, value = TRUE)
if (length(expr_figs) > 0) {
  for (f in expr_figs) {
    uri <- img_to_base64(f)
    if (!is.null(uri)) {
      expr_html <- paste0(expr_html,
        '<div class="figure-block">',
        '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
        '<p class="figure-caption">', html_esc(basename(f)), '</p>',
        '<details><summary>R Code</summary><pre><code>',
        '# Placeholder: code that generated ', html_esc(basename(f)), '\n',
        '# Will be populated when the analysis pipeline records code snippets.',
        '</code></pre></details>',
        '</div>')
    }
  }
} else {
  expr_html <- paste0(expr_html,
    '<p class="placeholder">No expression analysis figures detected yet. ',
    'PCA plots, heatmaps, and sample-correlation plots will appear here after quantification.</p>')
}
expr_html <- paste0(expr_html, '</div>')
sections <- c(sections, list(list(id = "expression", title = "Expression Analysis", html = expr_html)))

# --- Differential Expression -----------------------------------------------
if (job_type %in% c("dge", "rnaseq")) {
  de_html <- '<div class="card">'
  if (!is.null(de_results_file)) {
    tryCatch({
      de <- read.delim(de_results_file, header = TRUE, check.names = FALSE)
      sig_count <- sum(de[["padj"]] < 0.05 | de[["FDR"]] < 0.05, na.rm = TRUE)
      de_html <- paste0(de_html,
        '<h3>Differential Expression Results</h3>',
        '<p>Source: <code>', html_esc(basename(de_results_file)), '</code></p>',
        '<p>Total features tested: <strong>', nrow(de), '</strong> | ',
        'Significant (adj. p &lt; 0.05): <strong>', sig_count, '</strong></p>',
        '<div class="table-wrapper"><table class="data-table sortable">',
        '<thead><tr>', paste0('<th>', html_esc(colnames(de)), '</th>', collapse = ""), '</tr></thead>',
        '<tbody>')
      top <- head(de[order(de[[grep("padj|FDR|adj", colnames(de), value = TRUE)[1]]]), ], 50)
      for (i in seq_len(nrow(top))) {
        de_html <- paste0(de_html, '<tr>',
          paste0('<td>', html_esc(as.character(top[i, ])), '</td>', collapse = ""),
          '</tr>')
      }
      de_html <- paste0(de_html, '</tbody></table></div>',
        '<p class="note">Showing top 50 results sorted by adjusted p-value.</p>')
    }, error = function(e) {
      de_html <<- paste0(de_html,
        '<p class="placeholder">Could not parse DE results: ', html_esc(conditionMessage(e)), '</p>')
    })
  } else {
    de_html <- paste0(de_html,
      '<p class="placeholder">No differential expression results found. ',
      'This section will be populated after DE analysis (DESeq2/edgeR/limma-voom).</p>')
  }
  de_figs <- grep("volcano|ma.plot|smear|de_|diffexp", figure_files, ignore.case = TRUE, value = TRUE)
  for (f in de_figs) {
    uri <- img_to_base64(f)
    if (!is.null(uri)) {
      de_html <- paste0(de_html,
        '<div class="figure-block">',
        '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
        '<p class="figure-caption">', html_esc(basename(f)), '</p>',
        '<details><summary>R Code</summary><pre><code>',
        '# Placeholder: code that generated ', html_esc(basename(f)),
        '</code></pre></details>',
        '</div>')
    }
  }
  de_html <- paste0(de_html, '</div>')
  sections <- c(sections, list(list(id = "de", title = "Differential Expression", html = de_html)))
}

# --- Pathway Analysis ------------------------------------------------------
if (job_type %in% c("dge", "rnaseq")) {
  pw_html <- '<div class="card">'
  if (!is.null(pathway_file)) {
    tryCatch({
      pw <- read.delim(pathway_file, header = TRUE, check.names = FALSE)
      pw_html <- paste0(pw_html,
        '<h3>Pathway / Gene Set Enrichment</h3>',
        '<p>Source: <code>', html_esc(basename(pathway_file)), '</code></p>',
        '<div class="table-wrapper"><table class="data-table sortable">',
        '<thead><tr>', paste0('<th>', html_esc(colnames(pw)), '</th>', collapse = ""), '</tr></thead>',
        '<tbody>')
      for (i in seq_len(min(nrow(pw), 50))) {
        pw_html <- paste0(pw_html, '<tr>',
          paste0('<td>', html_esc(as.character(pw[i, ])), '</td>', collapse = ""),
          '</tr>')
      }
      pw_html <- paste0(pw_html, '</tbody></table></div>')
    }, error = function(e) {
      pw_html <<- paste0(pw_html,
        '<p class="placeholder">Could not parse pathway results.</p>')
    })
  } else {
    pw_html <- paste0(pw_html,
      '<p class="placeholder">No pathway or gene set enrichment results found. ',
      'This section will appear after running enrichment analysis (clusterProfiler, fgsea, etc.).</p>')
  }
  pw_figs <- grep("pathway|enrichment|gsea|kegg|go_|dotplot|barplot.*enrich", figure_files,
                  ignore.case = TRUE, value = TRUE)
  for (f in pw_figs) {
    uri <- img_to_base64(f)
    if (!is.null(uri)) {
      pw_html <- paste0(pw_html,
        '<div class="figure-block">',
        '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
        '<p class="figure-caption">', html_esc(basename(f)), '</p>',
        '</div>')
    }
  }
  pw_html <- paste0(pw_html, '</div>')
  sections <- c(sections, list(list(id = "pathway", title = "Pathway Analysis", html = pw_html)))
}

# --- All Figures (catch-all) ------------------------------------------------
remaining_figs <- setdiff(figure_files, c(qc_figs, aln_figs, expr_figs,
                          if (exists("de_figs")) de_figs else character(0),
                          if (exists("pw_figs")) pw_figs else character(0)))
fig_html <- '<div class="card">'
if (length(remaining_figs) > 0) {
  for (f in remaining_figs) {
    uri <- img_to_base64(f)
    if (!is.null(uri)) {
      fig_html <- paste0(fig_html,
        '<div class="figure-block">',
        '<img src="', uri, '" alt="', html_esc(basename(f)), '" />',
        '<p class="figure-caption">', html_esc(basename(f)), '</p>',
        '</div>')
    }
  }
} else if (length(figure_files) == 0) {
  fig_html <- paste0(fig_html,
    '<p class="placeholder">No figures have been generated yet. ',
    'Figures will appear here as the analysis pipeline runs.</p>')
} else {
  fig_html <- paste0(fig_html,
    '<p>All figures have been categorised into the sections above.</p>')
}
fig_html <- paste0(fig_html, '</div>')
sections <- c(sections, list(list(id = "figures", title = "Figures", html = fig_html)))

# --- Materials & Methods ---------------------------------------------------
methods_html <- paste0(
  '<div class="card">',
  '<h3>Pipeline</h3>',
  '<p>Analyses were performed using the <strong>RNAdetector</strong> platform, ',
  'which orchestrates read quality control, alignment, quantification, ',
  'and downstream analysis via a reproducible containerised workflow.</p>',
  '<h3>Tools &amp; Versions</h3>',
  '<table class="data-table">',
  '<thead><tr><th>Tool</th><th>Purpose</th><th>Citation</th></tr></thead>',
  '<tbody>',
  '<tr><td>FastQC v0.12.1</td><td>Read quality control</td>',
  '<td>Andrews S. (2010). FastQC. Babraham Bioinformatics.</td></tr>',
  '<tr><td>Trim Galore v0.6.10</td><td>Adapter trimming</td>',
  '<td>Krueger F. (2012). Trim Galore. Babraham Bioinformatics.</td></tr>',
  '<tr><td>STAR v2.7.11b</td><td>Splice-aware alignment</td>',
  '<td>Dobin A. et al. (2013). Bioinformatics, 29(1):15-21.</td></tr>',
  '<tr><td>HISAT2 v2.2.1</td><td>Alignment (alternative)</td>',
  '<td>Kim D. et al. (2019). Nature Biotechnology, 37:907-915.</td></tr>',
  '<tr><td>Salmon v1.10.0</td><td>Transcript quantification</td>',
  '<td>Patro R. et al. (2017). Nature Methods, 14:417-419.</td></tr>',
  '<tr><td>featureCounts (Subread v2.0.6)</td><td>Read counting</td>',
  '<td>Liao Y. et al. (2014). Bioinformatics, 30(7):923-930.</td></tr>',
  '<tr><td>DESeq2 v1.40</td><td>Differential expression</td>',
  '<td>Love M.I. et al. (2014). Genome Biology, 15:550.</td></tr>',
  '<tr><td>edgeR v3.42</td><td>Differential expression (alternative)</td>',
  '<td>Robinson M.D. et al. (2010). Bioinformatics, 26(1):139-140.</td></tr>',
  '<tr><td>clusterProfiler v4.8</td><td>Gene set enrichment</td>',
  '<td>Wu T. et al. (2021). The Innovation, 2(3):100141.</td></tr>',
  '<tr><td>R v', R.version$major, '.', R.version$minor, '</td><td>Statistical computing</td>',
  '<td>R Core Team (', format(Sys.Date(), "%Y"), '). R Foundation for Statistical Computing.</td></tr>',
  '</tbody></table>',
  '<h3>Reproducibility</h3>',
  '<p>Job ID: <code>', html_esc(job_id), '</code><br>',
  'Report generated: <code>', html_esc(timestamp), '</code><br>',
  'Platform: RNAdetector (Docker)</p>',
  '</div>')
sections <- c(sections, list(list(id = "methods", title = "Materials & Methods", html = methods_html)))

# ---------------------------------------------------------------------------
# Assemble full HTML document
# ---------------------------------------------------------------------------
nav_items <- paste(sapply(sections, function(s) {
  paste0('<a href="#', s$id, '">', html_esc(s$title), '</a>')
}), collapse = "\n        ")

section_blocks <- paste(sapply(sections, function(s) {
  paste0('<section id="', s$id, '">\n<h2>', html_esc(s$title), '</h2>\n', s$html, '\n</section>')
}), collapse = "\n\n")

html_doc <- paste0('<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RNAdetector Report &mdash; ', html_esc(job_name), '</title>
<style>
:root {
  --bg: #1a1a2e;
  --bg-card: #16213e;
  --bg-sidebar: #0f3460;
  --text: #e0e0e0;
  --text-muted: #a0a0b0;
  --accent: #e94560;
  --accent2: #0f9b8e;
  --border: #2a2a4a;
  --link: #53a8b6;
  --code-bg: #0d1b2a;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  display: flex;
  min-height: 100vh;
}
/* Sidebar */
.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: 240px;
  height: 100vh;
  background: var(--bg-sidebar);
  padding: 24px 16px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  z-index: 100;
}
.sidebar h1 {
  font-size: 1.1rem;
  color: var(--accent);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.sidebar .job-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 20px;
  word-break: break-all;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar nav a {
  color: var(--text);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.2s;
}
.sidebar nav a:hover,
.sidebar nav a:focus {
  background: rgba(255,255,255,0.08);
  color: var(--link);
}
/* Main content */
.main {
  margin-left: 240px;
  padding: 40px 48px;
  max-width: 1100px;
  width: 100%;
}
h2 {
  font-size: 1.5rem;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--accent);
}
h3 {
  font-size: 1.15rem;
  color: var(--accent2);
  margin: 16px 0 8px;
}
section {
  margin-bottom: 48px;
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}
/* Tables */
.table-wrapper {
  overflow-x: auto;
  margin: 12px 0;
}
.data-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85rem;
}
.data-table th, .data-table td {
  padding: 8px 12px;
  border: 1px solid var(--border);
  text-align: left;
}
.data-table th {
  background: var(--bg-sidebar);
  color: var(--accent2);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.data-table th:hover {
  background: rgba(15,59,96,0.9);
}
.data-table th::after {
  content: " \\2195";
  font-size: 0.7em;
  opacity: 0.4;
}
.data-table tbody tr:nth-child(even) {
  background: rgba(255,255,255,0.02);
}
.data-table tbody tr:hover {
  background: rgba(83,168,182,0.08);
}
.summary-table {
  border-collapse: collapse;
  font-size: 0.95rem;
}
.summary-table th {
  text-align: right;
  padding: 6px 16px 6px 0;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}
.summary-table td {
  padding: 6px 0;
}
/* Figures */
.figure-block {
  margin: 20px 0;
  text-align: center;
}
.figure-block img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid var(--border);
}
.figure-caption {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 6px;
  font-style: italic;
}
/* Code blocks */
details {
  margin: 8px 0;
}
details summary {
  cursor: pointer;
  color: var(--link);
  font-size: 0.85rem;
  padding: 4px 0;
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.5;
}
code {
  font-family: "Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  font-size: 0.88em;
}
p code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 3px;
}
.placeholder {
  color: var(--text-muted);
  font-style: italic;
  padding: 12px 0;
}
.note {
  color: var(--text-muted);
  font-size: 0.82rem;
  margin-top: 8px;
}
a { color: var(--link); }
strong { color: #f0f0f0; }
/* Print */
@media print {
  .sidebar { display: none; }
  .main { margin-left: 0; }
  body { background: #fff; color: #111; }
  .card { border-color: #ccc; background: #fafafa; }
  h2 { color: #333; border-color: #333; }
}
/* Responsive */
@media (max-width: 768px) {
  .sidebar { width: 100%; height: auto; position: relative; }
  .sidebar nav { flex-direction: row; flex-wrap: wrap; }
  .main { margin-left: 0; padding: 20px; }
}
</style>
</head>
<body>
<aside class="sidebar">
  <h1>RNAdetector</h1>
  <div class="job-label">', html_esc(job_name), '</div>
  <nav>
    ', nav_items, '
  </nav>
</aside>
<main class="main">
  <header style="margin-bottom:32px;">
    <h1 style="font-size:1.8rem;color:var(--accent);">Analysis Report</h1>
    <p style="color:var(--text-muted);">', html_esc(job_name), ' &mdash; ', html_esc(timestamp), '</p>
  </header>

', section_blocks, '

  <footer style="margin-top:48px;padding-top:16px;border-top:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;">
    Generated by RNAdetector | Job ', html_esc(job_id), ' | ', html_esc(timestamp), '
  </footer>
</main>

<script>
// Minimal sortable table columns
document.querySelectorAll(".sortable th").forEach(function(th) {
  th.addEventListener("click", function() {
    var table = th.closest("table");
    var tbody = table.querySelector("tbody");
    var rows = Array.from(tbody.querySelectorAll("tr"));
    var idx = Array.from(th.parentNode.children).indexOf(th);
    var asc = th.dataset.sort !== "asc";
    th.parentNode.querySelectorAll("th").forEach(function(h) { delete h.dataset.sort; });
    th.dataset.sort = asc ? "asc" : "desc";
    rows.sort(function(a, b) {
      var va = a.children[idx].textContent.trim();
      var vb = b.children[idx].textContent.trim();
      var na = parseFloat(va), nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return asc ? na - nb : nb - na;
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
  });
});
</script>
</body>
</html>')

# ---------------------------------------------------------------------------
# Write report
# ---------------------------------------------------------------------------
report_path <- file.path(output_dir, "report.html")
writeLines(html_doc, report_path, useBytes = TRUE)
cat("Report written to:", report_path, "\n")

# Set permissions so all users can read
Sys.chmod(report_path, mode = "0666")
