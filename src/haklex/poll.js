export const pollAdapter = {
  usePollState() {
    return {
      canVote: true,
      closed: false,
      status: "ready",
      tallies: {},
      totalVotes: 0,
    };
  },
  useSubmit() {
    return async () => {};
  },
};
