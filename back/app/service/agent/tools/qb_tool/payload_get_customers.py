payload_get_customers = {
    "operationName": "GetCustomers",
    "variables": {
        "offset": 0,
        "limit": 250,
        "sortBy": [
            {"field": "SCORE", "order": "DESC"},
            {"field": "FULL_NAME", "order": "ASC"},
        ],
        "or": [
            {
                "and": [
                    {"equalsIn": {"field": "TYPE", "value": ["CUSTOMER"]}},
                    {"equalsIn": {"field": "ACTIVE", "value": ["true"]}},
                    {
                        "equalsIn": {
                            "field": "CUSTOMER_CUSTOMER_TYPE",
                            "value": ["CUSTOMER"],
                        }
                    },
                ]
            }
        ],
    },
    "query": "query GetCustomers($offset: Int!, $limit: Int!, $search: String, $sortBy: [ContactSortInput!], $or: [ContactOrConditionInput!]) {\n  contacts(page: {offset: $offset, limit: $limit}, search: $search, sortBy: $sortBy, or: $or) {\n    data {\n      ...contactAttributes\n      ...customerAttributes\n      __typename\n    }\n    totalCount\n    __typename\n  }\n}\n\nfragment contactAttributes on Contact {\n  id\n  type\n  firstName\n  middleName\n  lastName\n  fullName\n  displayName\n  currencyType\n  active\n  addressDirectory {\n    billing {\n      lines\n      city\n      state\n      country\n      postalCode\n      freeForm\n      __typename\n    }\n    shipping {\n      lines\n      city\n      state\n      country\n      postalCode\n      freeForm\n      __typename\n    }\n    primary {\n      lines\n      city\n      state\n      country\n      postalCode\n      freeForm\n      __typename\n    }\n    __typename\n  }\n  phoneDirectory {\n    primary {\n      number\n      __typename\n    }\n    secondary {\n      number\n      __typename\n    }\n    mobile {\n      number\n      __typename\n    }\n    __typename\n  }\n  emailDirectory {\n    primary {\n      address\n      __typename\n    }\n    __typename\n  }\n  websiteDirectory {\n    primary {\n      url\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment customerAttributes on CustomerDetail {\n  customerType\n  level\n  parentId\n  balance {\n    amount\n    homeAmount\n    totalAmount\n    homeTotalAmount\n    __typename\n  }\n  companyName\n  nameOnCheck\n  accountId\n  __typename\n}\n",
}


# payload_get_customers= "{\"query\":\"query GetCustomers($offset: Int!, $limit: Int!, $search: String, $sortBy: [ContactSortInput!], $or: [ContactOrConditionInput!]) {  contacts(page: {offset: $offset, limit: $limit}, search: $search, sortBy: $sortBy, or: $or) {    data {      ...contactAttributes      ...customerAttributes      __typename    }    totalCount    __typename  }}fragment contactAttributes on Contact {  id  type  firstName  middleName  lastName  fullName  displayName  currencyType  active  addressDirectory {    billing {      lines      city      state      country      postalCode      freeForm      __typename    }    shipping {      lines      city      state      country      postalCode      freeForm      __typename    }    primary {      lines      city      state      country      postalCode      freeForm      __typename    }    __typename  }  phoneDirectory {    primary {      number      __typename    }    secondary {      number      __typename    }    mobile {      number      __typename    }    __typename  }  emailDirectory {    primary {      address      __typename    }    __typename  }  websiteDirectory {    primary {      url      __typename    }    __typename  }  __typename}fragment customerAttributes on CustomerDetail {  customerType  level  parentId  balance {    amount    homeAmount    totalAmount    homeTotalAmount    __typename  }  companyName  nameOnCheck  accountId  __typename}\\n\",\"variables\":{\"offset\":0,\"limit\":250,\"sortBy\":[{\"field\":\"SCORE\",\"order\":\"DESC\"},{\"field\":\"FULL_NAME\",\"order\":\"ASC\"}],\"or\":[{\"and\":[{\"equalsIn\":{\"field\":\"TYPE\",\"value\":[\"CUSTOMER\"]}},{\"equalsIn\":{\"field\":\"ACTIVE\",\"value\":[\"true\"]}},{\"equalsIn\":{\"field\":\"CUSTOMER_CUSTOMER_TYPE\",\"value\":[\"CUSTOMER\"]}}]}]}}"
