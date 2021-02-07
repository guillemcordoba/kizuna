import { AgentPubKey } from "@holochain/conductor-api";

export const SET_USERNAME = "SET_USERNAME";

export interface Profile {
  id: AgentPubKey;
  username: string;
}

export interface ProfileState {
  username: string | null;
}

interface SetUsernameAction {
  type: typeof SET_USERNAME;
  username: string;
}

export type ProfileActionTypes = SetUsernameAction;
