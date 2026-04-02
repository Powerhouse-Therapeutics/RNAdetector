#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(optparse)
  library(rjson)
  library(dplyr)
  library(metaseqR)
})

unslash <- function(dirs) (sub("/+$", "", dirs))

option_list <- list(
  make_option(c("-c", "--config"), type="character", default=NULL, help="config file", metavar="character")
); 

opt_parser <- OptionParser(option_list=option_list)
opt        <- parse_args(opt_parser)

if (is.null(opt$config) || !file.exists(opt$config)) {
  print_help(opt_parser)
  stop("Config file is required!", call.=FALSE)
}

config <- fromJSON(file = opt$config)

if (is.null(config$description.file) || !file.exists(config$description.file)) {
  stop("Missing data description file.", call. = FALSE)
}
if (is.null(config$data.file) || !file.exists(config$data.file)) {
  stop("Missing data file.", call. = FALSE)
}
if (is.null(config$data.type)) {
  config$data.type <- "gene"
}
if (is.null(config$conditions.variables) || length(config$conditions.variables) <= 0) {
  stop("Missing condition variables.", call. = FALSE)
}
if (is.null(config$contrasts) || length(config$contrasts) <= 0) {
  stop("Missing contrasts.", call. = FALSE)
}
if (is.null(config$output.directory)) {
  stop("Missing output directory", call. = FALSE)
}
config$output.directory <- unslash(config$output.directory)

descriptions <- read.delim(config$description.file, stringsAsFactors=FALSE)
if (!("SampleName" %in% colnames(descriptions))) {
  stop("Invalid description file.", call. = FALSE)
}
data         <- read.delim(config$data.file, stringsAsFactors=FALSE)
variables    <- config$conditions.variables[config$conditions.variables %in% colnames(descriptions)]
if (length(variables) <= 0) {
  stop("No valid variables found.", call. = FALSE)
}

clear.names <- function (x) (gsub("\\s+", "_", x, perl = TRUE))

descriptions$condition <- clear.names(do.call(paste, 
                                              c(
                                                lapply(variables, function (v)(descriptions[[v]])), 
                                                list(sep="_"))))

samples.list <- tapply(make.names(descriptions$SampleName), make.names(clear.names(descriptions$condition)), function(x) (x))
contrasts.list <- sapply(config$contrasts, function(x)(paste(make.names(clear.names(x)), collapse = "_vs_")))

source.data <- data
data$gc     <- 0
common.cols <- c("id","name","chr","start","end","strand","length","gc")
if (all("mapped_id" %in% colnames(data))) {
  data$mapped_id <- NULL
  data <- unique(data)
}
other.cols  <- setdiff(colnames(data), common.cols)
data        <- data[,c(common.cols, other.cols)]

if (is.null(config$parameters)) {
  params <- list()
} else {
  params <- config$parameters
}

check.list <- function (what, defaults=NULL) {
  if (is.null(what) || !is.list(what)) {
    res <- list()
  } else {
    res <- what
  }
  if (!is.null(defaults) && is.list(defaults)) {
    res <- modifyList(defaults, res)
  }
  return (res)
}

check.vector <- function (what, default) {
  if (is.null(what) || !is.vector(what)) {
    res <- default
  } else {
    res <- what
  }
  return (res)
}

restrict.cores <- 1 / check.vector(params$num.cores, 1)
restrict.cores <- max(min(restrict.cores, 1), 1 / detectCores())
pcut <- check.vector(params$pcut, 0.05)
pcut <- max(min(pcut, 1), 0)
when.apply.filter <- check.vector(params$when.apply.filter, "prenorm")
norm.algo <- check.vector(params$norm, "edger")
norm.algo.params <- check.list(params$norm.args, get.defaults("normalization", norm.algo))
if (norm.algo == "deseq") {
  if (!is.null(norm.algo.params$locfunc) && is.character(norm.algo.params$locfunc)) {
    if (norm.algo.params$locfunc == 'shorth') {
      norm.algo.params$locfunc <- genefilter::shorth
    } else {
      norm.algo.params$locfunc <- stats::median
    }
  }
}
stats.algo <- check.vector(params$stats, "limma")
stats.algo.params <- check.list(params$stats.args)
stats.algo.params <- setNames(lapply(stats.algo, function (a) {
  tmp <- check.list(stats.algo.params[[a]], get.defaults("statistics", a))
}), stats.algo)
default.filters <- get.defaults("gene.filter", "")
gene.filters <- check.list(params$filters)
for (f in names(gene.filters)) {
  if (is.null(gene.filters[[f]])) {
    gene.filters[[f]] <- NULL 
  } else {
    gene.filters[[f]] <- modifyList(default.filters[[f]], gene.filters[[f]])
  }
}

suppressWarnings({
  data$id <- make.unique(data$id)
  meta <- metaseqr(
    counts=data,
    sample.list=samples.list,
    contrast=contrasts.list,
    id.col = 1,
    name.col = 2,
    gc.col = 8,
    annotation = "embedded",
    org = "custom",
    trans.level = config$data.type,
    count.type = "gene",
    when.apply.filter = when.apply.filter,
    normalization = norm.algo,
    norm.args = norm.algo.params,
    statistics = stats.algo,
    stat.args = stats.algo.params,
    pcut = pcut,
    adjust.method = check.vector(params$adjust.method, "qvalue"),
    meta.p = check.vector(params$meta.p.method, "simes"),
    gene.filters = gene.filters,
    qc.plots=c(
      "mds", "biodetection", "countsbio", "saturation", "readnoise",
      "filtered", "correl", "pairwise", "boxplot", # "lengthbias", 
      "deheatmap", "volcano", # "meandiff", "meanvar", "rnacomp", 
      "biodist", "venn"
    ),
    fig.format=check.vector(params$fig.formats, c("png","pdf")),
    export.where=config$output.directory,
    export.what = c(
      "annotation", "p.value", "adj.p.value", "meta.p.value", 
      "adj.meta.p.value", "fold.change", "stats"
    ),
    export.scale = c("natural", "log2"),
    export.values = c("raw", "normalized"),
    export.stats = c("mean", "median", "sd"),
    export.counts.table = TRUE,
    out.list = TRUE
  )
  save(source.data, meta, samples.list, contrasts.list,
       file = paste0(config$output.directory, "/data/analysis.RData"))
})

# Generate enhanced analysis report with Materials & Methods
tryCatch({
  report_template <- file.path(dirname(config$output.directory), "../../scripts/resources/reports/analysis_report.Rmd")
  # Fall back to default template path inside the container
  if (!file.exists(report_template)) {
    report_template <- "/rnadetector/scripts/resources/reports/analysis_report.Rmd"
  }
  if (file.exists(report_template)) {
    references_bib <- file.path(dirname(report_template), "references.bib")
    methods_rmd <- file.path(dirname(report_template), "materials_methods.Rmd")

    # Copy bibliography to output directory
    if (file.exists(references_bib)) {
      file.copy(references_bib, file.path(config$output.directory, "references.bib"), overwrite = TRUE)
    }
    if (file.exists(methods_rmd)) {
      file.copy(methods_rmd, file.path(config$output.directory, "materials_methods.Rmd"), overwrite = TRUE)
    }

    rmarkdown::render(
      input = report_template,
      output_file = file.path(config$output.directory, "analysis_report.html"),
      output_dir = config$output.directory,
      params = list(
        title = "Differential Expression Analysis Report",
        pipeline_version = "2.0",
        analysis_type = "diff_expr",
        de_method = paste(stats.algo, collapse = ", "),
        norm_method = norm.algo,
        p_cutoff = pcut,
        adjust_method = check.vector(params$adjust.method, "qvalue"),
        num_samples = nrow(descriptions),
        num_contrasts = length(contrasts.list),
        contrasts = paste(contrasts.list, collapse = "; "),
        conditions = paste(names(samples.list), collapse = ", "),
        threads = check.vector(params$num.cores, 1),
        output_dir = config$output.directory
      ),
      envir = new.env(parent = globalenv()),
      quiet = TRUE
    )
    cat("Enhanced analysis report generated successfully.\n")
  }
}, error = function(e) {
  cat(paste0("Warning: Could not generate enhanced report: ", e$message, "\n"))
})

