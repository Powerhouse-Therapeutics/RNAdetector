#!/usr/bin/env Rscript

install.packages("BiocManager")
BiocManager::install(c("limma", "edgeR", "DESeq2", "readr", "tximport",
                       "optparse", "dplyr", "rtracklayer", "plyr",
                       "survcomp", "VennDiagram", "knitr", "zoo",
                       "devtools", "plotly", "rmarkdown", "DT",
                       "heatmaply", "shiny",
                       "clusterProfiler", "enrichplot", "DOSE", "fgsea",
                       "org.Hs.eg.db", "org.Mm.eg.db", "org.Rn.eg.db",
                       "msigdbr"),ask = FALSE)

devtools::install_github("rstudio/d3heatmap", dependencies = TRUE, upgrade = "always")
remotes::install_github("alaimos/metaseqR", dependencies = TRUE, upgrade = "always")
