cts.search (
    cts.andQuery([
        cts.collectionQuery("rentals"),
        cts.jsonPropertyValueQuery("customer_id", "500")
    ])
)