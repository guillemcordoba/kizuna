import { ThunkAction } from "../../types";

const logout =
  (): ThunkAction =>
  async (_dispatch, _getState, { client, init }) => {
    const c = client ? (client as any) : await init();
    await c.signOut();
    window.location.reload();
  };

export default logout;
