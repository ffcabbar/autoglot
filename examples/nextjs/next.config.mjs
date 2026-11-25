export default {
  agentRules: false,
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  }
};
