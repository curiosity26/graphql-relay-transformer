# GraphQL Relay Transformer
## A GraphQL transformer for AWS Amplify that creates connections and edges for Relay Modern

### Installation

Download the package from npm:

```shell
npm i @curiosity26/graphql-relay-transformer
```

or using Yarn

```shell
yarn add @curiosity26/graphql-relay-transformer
```

Add the transformer to the list of transformers in the config file
located at `amplify/backend/api/<api-name>/transformers.conf.json`.

```json
{
    "transformers":[
        "@curiosity26/graphql-relay-transformer",
    ]
}
```

#### React Relay

If you're using [React Relay](https://relay.dev), you'll need to add
the custom scalar types to the  `clientSchema.graphql` file located in the 
root directory of your app.

```graphql
scalar AWSTime
scalar AWSDate
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSPhone
scalar AWSURL
scalar AWSIPAddress
```

### Usage

Everywhere you would use `@model` you now should use `@relayModel` and everywhere you
would use `@connection`, you now use `@relayConnection`. All directive parameters are the same.

What changes is the parameters of the query function in GraphQL and the response of a connection with multiple items.

```graphql
type Post @relayModel {
    id: ID!
    name: String
    comments: [Comment] @relayConnection(name: "PostComments", keyField: "postId")
}

type Comment @relayModel {
    id: ID!
    body: String!
    post: Post! @relayConnection(name: "PostComments", keyField: "postId")
}

# Example query
query GetPost($id: ID!, $filter: RelayModelCommentFilterInput, $sort: RelayModelSortFilter, $first: Int!, $cursor: String) {
    getPost(id: $id) {
        id
        name
        comments(filter: $filter, sort: $sort, first: $limit, after: $cursor) {
            edges {
                node {
                    id
                    body
                }
            }
        }
    }
}
```

The first thing to note is that the `comments` field on `Post` still has the same `[Comment]`
type as is typically defined on a field where `@connection` is used. Just
as `@connection` modifies the outputted GraphQL to be `{ items: [Comment] }`,
`@relatConnection` changes the schema to be `{ edges: [{ node: Comment }] }`.

> IMPORTANT
> It is not recommended to use `@model`/`@connection` alongside
> `@relayModel`/`@`relayConnection`. It's best to choose a schema structure
> that works best for you and stick with it. Using both directives in the same
> schema could have adverse effects and is not recommended.

The next thing to note is in the example query. The generated schema
will use the parameters `first` instead of `limit` and `after` in place of `nextCursor`.
This conforms with the requirements defined by Relay Modern schema style.

It's worth noting that Relay Modern also allows for `last` and `before`, however,
the cursor implementation with DynamoDB is currently forward-only. It's not to say a
previous cursor implementation can't be done, it's just that I haven't spent too much time
looking into that yet. If it can be done, I'd really like to do it.

### References
- [React Relay](https://relay.dev)
- [AWS Amplify](https://docs.amplify.aws/)
- [AWS AppSync Scalar Types](https://docs.aws.amazon.com/appsync/latest/devguide/scalars.html)

### Copyleft
Much of the work here is an extension/alteration of existing code
written by the fine folks at AWS Amplify. That code can be found on their
GitHub: [aws-amplify/amplify-cli](https://github.com/aws-amplify/amplify-cli/).