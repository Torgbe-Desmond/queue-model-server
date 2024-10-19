const resolvers = {
    Query: {
      games() {
        return games;
      },
      reviews() {
        return reviews;
      },
      authors() {
        return authors;
      },
    },
  }


module.exports = { resolvers}