cts.search (
    cts.andQuery([
        cts.notQuery(cts.collectionQuery("CustomMergeRentals")),
        cts.collectionQuery("sm-Customer-merged")]
    )
)