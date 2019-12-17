# options(width = 1000, help_type = "html")

# do.call(options, list(width = 1000, help_type = "html"))



# RGUI_call(list(
#     library = list(package = "venn"),
#     options = list(width = 1000, help_type = "html")
# ))


attach(NULL, name = "RGUI") 
env <- as.environment("RGUI")

env$RGUI_formatted <- FALSE
env$RGUI_hashes <- list()
env$RGUI_objtype <- list()
env$RGUI_visiblecols <- 8 # visible columns \
env$RGUI_visiblerows <- 17 # visible rows   / from (size of) the data editor in the GUI
env$RGUI_result <- c()

env$RGUI_numhash <- function(x) {
    strobj <- paste(capture.output(.Internal(inspect(x))), collapse = "\n")
    return(mean(as.integer(charToRaw(strobj))))
}



env$RGUI_possibleNumeric <- function(x) {
    if (all(is.na(x))) {
        return(FALSE)
    }

    if (inherits(x, "haven_labelled")) {
        return(!any(is.na(suppressWarnings(as.numeric(names(attr(x, "labels")))))))
    }

    if (is.numeric(x)) {
        return(TRUE)
    }

    if (is.factor(x)) {
        return(!any(is.na(suppressWarnings(as.numeric(levels(x))))))
    }

    # as.character converts everything (especially factors)
    return(!any(is.na(suppressWarnings(as.numeric(na.omit(x))))))
}

env$RGUI_asNumeric <- function (x) {
    if (is.numeric(x)) {
        return(x)
    }
    if (is.factor(x)) {
        return(suppressWarnings(as.numeric(levels(x)))[x])
    }
    return(suppressWarnings(as.numeric(as.character(x))))
}

env$RGUI_jsonify <- function(x, n = 1) {
    # x should ALWAYS  be a list
    # whose components are either:
    # - lists, when RGUI_jsonify() will be Recall()-ed recursively
    # or
    # - vectors
    # the argument n helps indent the JSON output

    env <- as.environment("RGUI")
    indent <- paste(rep(" ", n*4), collapse = "")
    followup <- paste(rep(" ", (n - 1)*4), collapse = "")
    nms <- names(x)
    result <- ""
    for (i in seq(length(x))) {

        xi <- x[[i]]

        if (inherits(xi, "list")) {
            
            if (length(xi) > 0) {
                nmsi <- names(xi)

                if (is.null(nmsi)) {
                    # unnamed list, ex. vdata
                    result <- paste(result, "\"", nms[i], "\": [\n", indent, Recall(xi, n = n + 1), "\n", followup, "]",  sep = "")
                }
                else {
                    if (is.null(xi)) {
                        result <- paste(result, "\"", nms[i], "\"", ": undefined", sep = "")
                    }
                    else {
                        result <- paste(result, "\"", nms[i], "\"", ": {\n", indent, Recall(xi, n = n + 1), "\n", followup, "}",  sep = "")
                    }
                }
            }
            else {
                result <- paste(result, "\"", nms[i], "\"", ": {}",  sep = "")
            }
        }
        else {
            # xi is a vector
            collapse <- ", "
            prefix <- ""
            if (!env$RGUI_possibleNumeric(xi) || inherits(xi, "Date")) {
                collapse <- '", "'
                prefix <- '"'
            }
            
            if (is.logical(x[[i]])) {
                x[[i]] <- gsub("TRUE", "true", gsub("FALSE", "false", as.character(x[[i]])))
            }

            x[[i]] <- gsub('"', '\\\\\"', x[[i]])
            x[[i]][is.na(x[[i]])] <- ""
            # check <- length(x[[i]]) > 1 | is.character(x)
            result <- paste(result,
                ifelse (is.null(nms[i]), 
                    # sprintf(ifelse(check, "[%s%s%s]", "%s%s%s"), prefix, paste(x[[i]], collapse = collapse), prefix),
                    # sprintf(ifelse(check, '"%s": [%s%s%s]', '"%s": %s%s%s'), nms[i], prefix, paste(x[[i]], collapse = collapse), prefix)
                    sprintf("[%s%s%s]", prefix, paste(x[[i]], collapse = collapse), prefix),
                    sprintf('"%s": [%s%s%s]', nms[i], prefix, paste(x[[i]], collapse = collapse), prefix)
                ),
            sep = "")

        }

        if (i < length(x)) {
            result <- paste(result, ",\n", followup, sep = "")
        }
    }

    return(result)
}

env$RGUI_scrollvh <- function(...) {
    env <- as.environment("RGUI")
    # fie fac ceva cu ea, fie o sa intre in fata in lista de comenzi, pun informatiile in env si le folosesc mai tarziu
}

env$RGUI_scrollobj <- function(...) {
    env <- as.environment("RGUI")
    x <- list(...)
    # o sa intre in fata in lista de comenzi, pun informatiile in env si le folosesc mai tarziu
    scrollvh <- lapply(x$scrollvh, function(x) unlist(x) + 1)
    env$RGUI_visiblerows <- x$RGUI_visiblerows + 1
    env$RGUI_visiblecols <- x$RGUI_visiblecols + 1

    if (!x$alldata) {
        scrollvh <- scrollvh[x$dataset]
    }

    tosend <- vector(mode = "list", length = length(scrollvh))
    names(tosend) <- names(scrollvh)
    
    for (n in names(scrollvh)) {
        dimdata <- dim(.GlobalEnv[[n]])
        nrowd <- dimdata[1]
        ncold <- dimdata[2]
        
        dscrollvh <- scrollvh[[n]]
        srow <- min(dscrollvh[1], nrowd - min(nrowd, x$RGUI_visiblerows) + 1)
        scol <- min(dscrollvh[2], ncold - min(ncold, x$RGUI_visiblecols) + 1)
        erow <- min(srow + x$RGUI_visiblerows, nrowd)
        ecol <- min(scol + x$RGUI_visiblecols, ncold)
        
        tosend[[n]] <- list(
            vdata = unname(as.list(.GlobalEnv[[n]][seq(srow, erow), seq(scol, ecol), drop = FALSE])),
            vcoords = paste(srow, scol, erow, ecol, ncold, sep = "_"),
            scrollvh = c(srow, scol) - 1
        )
    }
    
    env$RGUI_result <- c(env$RGUI_result, env$RGUI_jsonify(list(scrolldata = tosend)))
}

# TO DO: replace scrollvh as an argument with scrollvh from env
env$RGUI_infobjs <- function(objtype) {
    env <- as.environment("RGUI")
    funargs <- lapply(match.call(), deparse)
    
    visiblerows <- env$RGUI_visiblerows
    visiblecols <- env$RGUI_visiblecols

    toreturn <- list()
    
    if (any(objtype > 0)) {
        if (any(objtype == 1)) { # data frames
            toreturn$dataframe <- lapply(names(objtype[objtype == 1]), function(n) {

                dscrollvh <- c(1, 1)

                if (is.element(n, names(env$RGUI_scrollvh))) {
                    dscrollvh <- env$RGUI_scrollvh[[n]]
                }

                nrowd <- nrow(.GlobalEnv[[n]])
                ncold <- ncol(.GlobalEnv[[n]])

                srow <- min(dscrollvh[1], nrowd - min(nrowd, visiblerows) + 1)
                scol <- min(dscrollvh[2], ncold - min(ncold, visiblecols) + 1)
                erow <- min(srow + visiblerows - 1, nrowd)
                ecol <- min(scol + visiblecols - 1, ncold)

                type <- sapply(.GlobalEnv[[n]], function(x) {
                    datv <- inherits(x, "Date")
                    numv <- env$RGUI_possibleNumeric(x) & !datv
                    chav <- is.character(x) & !numv
                    facv <- is.factor(x) & !numv
                    if (numv) x <- env$RGUI_asNumeric(x)
                    calv <- ifelse(numv, all(na.omit(x) >= 0 & na.omit(x) <= 1), FALSE)
                    binv <- ifelse(numv, all(is.element(x, 0:1)), FALSE)
                    
                    return(c(numv, calv, binv, chav, facv, datv))
                })

                return(list(
                    nrows = nrowd,
                    ncols = ncold,
                    rownames = rownames(.GlobalEnv[[n]]),
                    colnames = colnames(.GlobalEnv[[n]]),
                    numeric = as.vector(type[1, ]),
                    calibrated = as.vector(type[2, ]),
                    binary = as.vector(type[3, ]),
                    character = as.vector(type[4, ]),
                    factor = as.vector(type[5, ]),
                    date = as.vector(type[6, ]),
                    scrollvh = c(srow, scol) - 1, # for Javascript
                    vdata = unname(as.list(.GlobalEnv[[n]][seq(srow, erow), seq(scol, ecol), drop = FALSE])),
                    vcoords = paste(srow, scol, erow, ecol, ncol(.GlobalEnv[[n]]), sep = "_")
                ))
                # scrollvh = c(srow, scol, min(visiblerows, nrow(x)), min(visiblecols, ncol(x))) - 1,
                # vcoords = paste(c(srow, scol, erow, ecol, ncol(x)) - 1, collapse="_")
            })
            names(toreturn$dataframe) <- names(objtype[objtype == 1])
        }

        if (any(objtype == 2)) {
            toreturn$list <- names(objtype[objtype == 2])
        }

        if (any(objtype == 3)) {
            toreturn$matrix <- names(objtype[objtype == 3])
        }

        if (any(objtype == 4)) {
            toreturn$vector <- names(objtype[objtype == 4])
        }

        toreturn <- list(toreturn)
        names(toreturn) <- funargs$objtype

        env$RGUI_result <- c(env$RGUI_result, RGUI_jsonify(toreturn))
    }
}


env$RGUI_ChangeLog <- function(x) {
    env <- as.environment("RGUI")
    # TODO: verify if file ChangeLog exists
    changes <- gsub("`", "'", readLines(system.file("ChangeLog", package = x)))
    env$RGUI_result <- c(env$RGUI_result, env$RGUI_jsonify(list(changes = changes)))
}

env$RGUI_packages <- function(x) { # x contains the packages, as known by the webpage
    env <- as.environment("RGUI")
    attached <- data()$results[, -2]
    packages <- unique(attached[, "Package"])

    if (!identical(sort(packages), sort(x))) {
        # available <- suppressWarnings(data(package = .packages(all.available = TRUE)))$results[, -2]
        
        attached <- lapply(packages, function(x) {
            x <- attached[attached[, "Package"] == x, 2:3, drop = FALSE]
            x <- x[x[, 2] != "Internal Functions", , drop = FALSE] # to eliminate internal datasets in the QCA package
            
            if (nrow(x) == 0) return(list())
            
            titles <- as.list(x[, 2])
            names(titles) <- x[, 1]
            return(titles) # [1:2]
        })
        names(attached) <- packages
        env$RGUI_result <- c(env$RGUI_result, env$RGUI_jsonify(list(packages = attached)))
    }
}

env$RGUI_dependencies <- function(x) { # x contains the packages, as known by the webpage
    env <- as.environment("RGUI")
    installed <- unlist(lapply(x, function(x) {
        if (identical(tryCatch(unlist(packageVersion(x)), error = function(e) return(0)), 0)) {
            return(FALSE)
        }
        return(TRUE)
    }))
    
    if (any(!installed)) {
        env$RGUI_result <- c(env$RGUI_result, env$RGUI_jsonify(list(missing = x[!installed])))
    }
}

env$RGUI_editorsize <- function(visiblerows, visiblecols) {
    env <- as.environment("RGUI")
    env$RGUI_visiblerows <- visiblerows
    env$RGUI_visiblecols <- visiblecols
}

env$RGUI_import <- function(objlist) {
    env <- as.environment("RGUI")
    # callist <- list(file = pipe(paste("cut -f1-8 -d','", objlist$file)))
    callist <- list(file = pipe(paste("cut -f1-8 -d','", paste("'", objlist$file, "'", sep=""))))
    command <- objlist$command
    objlist$file <- NULL
    objlist$command <- NULL
    callist <- c(callist, objlist)
    obj <- do.call(command, callist)

    obj <- obj[seq(min(nrow(obj), 8)), seq(min(ncol(obj), 8)), drop = FALSE]

    imported <- list(
        rownames = rownames(obj),
        colnames = colnames(obj),
        vdata = unname(as.list(obj))
    )

    env$RGUI_result <- c(env$RGUI_result, RGUI_jsonify(list(imported = imported)))
}



env$RGUI_call <- function() {
    env <- as.environment("RGUI")
    
    objtype <- lapply(.GlobalEnv, function(x) {
        if (is.data.frame(x)) { # dataframes
            return(1)
        }
        else if (is.list(x) & !is.data.frame(x)) { # lists but not dataframes
            return(2)
        }
        else if (is.matrix(x)) { # matrices
            return(3)
        }
        else if (is.vector(x) & !is.list(x)) { # vectors
            return(4)
        }
        return(0)
    })

    hashes <- lapply(.GlobalEnv, env$RGUI_numhash) # current objects
    if (length(objtype) > 0) {
        hashes <- hashes[objtype > 0]
        objtype <- objtype[objtype > 0]
    }
    deleted <- FALSE
    changed <- FALSE

    if (length(hashes) > 0) {

        if (length(env$RGUI_hashes) > 0) {
            # deleted <- setdiff(names(env$RGUI_hashes), names(hashes))
            deleted <- !is.element(names(env$RGUI_hashes), names(hashes))
            common <- is.element(names(hashes), names(env$RGUI_hashes))
            changed <- common & !is.element(hashes[common], env$RGUI_hashes[common])
            added <- !is.element(names(hashes), names(env$RGUI_hashes))
            changed <- changed | added
        } else {
            changed <- rep(TRUE, length(hashes))
        }
    }
    else {
        if (length(env$RGUI_hashes) > 0) {
            deleted <- rep(TRUE, length(env$RGUI_hashes))
        }
    }

    if (any(changed)) {
        # it is important to overwrite "changed" because RGUI_infobjs()
        # uses the name of the input object to create the JSON component
        changed <- objtype[changed]
        # this will add directly in the RGUI_result
        RGUI_infobjs(changed)
    }

    if (any(deleted)) {
        objdel <- env$RGUI_objtype[deleted]
        deleted <- list()
        if (any(objdel == 1)) {
            deleted$dataframe <- names(objdel)[objdel == 1]
        }
        if (any(objdel == 2)) {
            deleted$list <- names(objdel)[objdel == 2]
        }
        if (any(objdel == 3)) {
            deleted$matrix <- names(objdel)[objdel == 3]
        }
        if (any(objdel == 4)) {
            deleted$vector <- names(objdel)[objdel == 4]
        }

        env$RGUI_result <- c(env$RGUI_result, RGUI_jsonify(list(deleted = deleted)))
    }

    env$RGUI_hashes <- hashes # overwrite the hash information
    env$RGUI_objtype <- objtype
    
    # temp <- tempfile()
    temp <- "bla.Rhistory"
    utils::savehistory(file = temp) # only in Terminal, not working on MacOS
    history <- readLines(temp)
    lhistory <- length(history)
    
    if (lhistory == 1) {
        writeLines("\n", con = temp)
    }
    else {
        writeLines(history[seq(lhistory - 1)], con = temp)
    }
    loadhistory(file = temp)
    # unlink(temp)

    if (length(env$RGUI_result) > 0) {
        env$RGUI_result <- paste("{", paste(env$RGUI_result, collapse = ",\n"), "}", sep = "")

        if (!env$RGUI_formatted) {
            env$RGUI_result <- gsub("[[:space:]]", "", env$RGUI_result)
        }
        
        cat("startR", env$RGUI_result, "endR")
        # we return an enter so we can detect the prompter
        # cat('\r\n')
    } else {
        cat('#nodata#')
    }

    env$RGUI_result <- c() 
}

rm(env)
# RGUI_import(list(command = "read.csv", commentChar = "#", dec = ".", header = "TRUE", na.strings = "NA", nrows = 7, quote = "\"", skip = 0, stripWhite = "FALSE")
