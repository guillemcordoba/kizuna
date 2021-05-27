import { AgentPubKey } from "@holochain/conductor-api";
import { HoloHash } from "../commons/types";
import { Profile } from "../profile/types";
import {
  Payload,
  TextPayload,
  FetchPayloadType,
  FilePayloadInput,
} from "../commons/types";

export const ADD_GROUP = "ADD_GROUP";
export const UPDATE_GROUP_NAME = "UPDATE_GROUP_NAME";
export const REMOVE_MEMBERS = "REMOVE_MEMBERS";
export const ADD_MEMBERS = "ADD_MEMBERS";
export const SET_GROUP_MESSAGE = "SET_GROUP_MESSAGE";
export const SET_NEXT_BATCH_GROUP_MESSAGES = "SET_NEXT_BATCH_GROUP_MESSAGES";
export const SET_MESSAGES_BY_GROUP_BY_TIMESTAMP =
  "SET_MESSAGES_BY_GROUP_BY_TIMESTAMP";
export const SET_LATEST_GROUP_STATE = "SET_LATEST_GROUP_STATE";
export const SET_LATEST_GROUP_VERSION = "SET_LATEST_GROUP_VERSION";
export const SET_FILES_BYTES = "SET_FILES_BYTES";
export const SET_GROUP_TYPING_INDICATOR = "SET_GROUP_TYPING_INDICATOR";
export const SET_GROUP_READ_MESSAGE = "SET_GROUP_READ_MESSAGE";

/* TYPE DECLARATIONS */
type GroupMessageIDB64 = string; // Group Message EntryHash in base64 string
type GroupIDB64 = string; // Group's EntryHash in base64 string
type GroupRevisionIDB64 = string; // Group's HeaderHash in base64 string
type PayloadInput = TextPayload | FilePayloadInput;
/* END OF TYPE DECLARATIONS */

/* INPUT DECLARATION */
export interface FileMetadataInput {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface CreateGroupInput {
  name: String;
  members: AgentPubKey[];
}

export interface UpdateGroupMembersIO {
  members: AgentPubKey[];
  groupId: HoloHash;
  groupRevisionId: HoloHash;
}

export interface UpdateGroupNameIO {
  name: string;
  groupId: HoloHash;
  groupRevisionId: HoloHash;
}

export interface GroupMessageInput {
  groupHash: HoloHash; // Group EntryHash
  payloadInput: PayloadInput;
  sender: AgentPubKey;
  replyTo?: HoloHash; // Group Message EntryHash
}

export interface GroupMessageBatchFetchFilter {
  groupId: HoloHash; // Group EntryHash
  lastFetched?: HoloHash; // the entry hash of the last message in the last batch fetched
  lastMessageTimestamp?: [number, number]; // 0 - seconds since epoch, 1 - nanoseconds. See Timestamp type in hdk doc for more info.
  batchSize: number;
  payloadType: FetchPayloadType;
}

export interface GroupMessageByDateFetchFilter {
  groupId: HoloHash; // Group EntryHash
  date: [number, number];
  payloadType: FetchPayloadType;
}

export interface GroupTypingDetailData {
  groupId: HoloHash; // Group EntryHash
  indicatedBy: AgentPubKey;
  members: AgentPubKey[];
  isTyping: boolean;
}

export interface GroupMessageReadData {
  groupId: HoloHash; // Group EntryHash
  messageIds: HoloHash[]; // Group Message EntryHash
  reader: AgentPubKey;
  timestamp: [number, number];
  members: AgentPubKey[];
}
/* END OF INPUT DECLARATION */

export interface GroupTypingDetail {
  groupId: GroupIDB64;
  indicatedBy: Profile;
  isTyping: boolean;
}

export interface GroupMessageReadDetail {
  groupId: GroupIDB64;
  messageIds: GroupMessageIDB64[];
  reader: string;
  timestamp: [number, number];
}

export interface GroupMessage {
  groupMessageEntryHash: GroupMessageIDB64;
  groupEntryHash: GroupIDB64;
  author: string;
  payload: Payload; // subject to change
  timestamp: [number, number];
  replyTo?: GroupMessageIDB64;
  readList: {
    // key is AgentPubKey
    [key: string]: Date;
  };
}

export interface GroupMessagesOutput {
  messagesByGroup: MessagesByGroup;
  groupMessagesContents: GroupMessagesContents;
}

export interface MessagesByGroup {
  // key here is the base64 string of Group EntryHash
  [key: string]: GroupMessageIDB64[];
}

export interface GroupMessagesContents {
  // key here is the base 64 string of GroupMessage EntryHash
  [key: string]: GroupMessage;
}

// Unused right now
// export interface GroupMessageElement {
//   // any field from Element received from HC can be added here
//   // as needed
//   entry: GroupMessage;
//   // base64 string
//   groupMessageHeaderHash: string;
//   groupMessageEntryHash: string;
//   // agentPubKey(?)
//   signature: string;
// }

// TODO: make sure this is fetched from holochain at some point
// export interface GroupVersion {
//   groupEntryHash: GroupID;
//   name: string;
//   conversants: string[];
//   timestamp: Date;
// }

export interface GroupConversation {
  originalGroupEntryHash: GroupIDB64;
  originalGroupHeaderHash: GroupRevisionIDB64;
  // versions: GroupVersion[];
  name: string;
  members: string[];
  createdAt: Date;
  creator: string;
  // TODO: enable setting of avatar for a GroupConversation
  avatar?: string;
  messages: GroupMessageIDB64[];
}

export interface UpdateGroupMembersData {
  // base64 string
  members: string[];
  groupId: GroupIDB64;
  groupRevisionId: GroupRevisionIDB64;
}

export interface UpdateGroupNameData {
  name: string;
  groupId: GroupIDB64;
  groupRevisionId: GroupRevisionIDB64;
}

/* GROUP CONVERSATION INTERFACE */

export interface GroupConversationsState {
  conversations: {
    // key should be the originalGroupEntryHash
    [key: string]: GroupConversation;
  };
  messages: {
    [key: string]: GroupMessage;
  };
  groupFiles: {
    [key: string]: Uint8Array;
  };
  // This makes it easier to manage when member of a group updates their username (username has no update fn yet)
  // and saves network calls to fetch username in case a member is part of multiple groups
  // key is agentPubKey
  members: {
    [key: string]: Profile;
  };
  typing: {
    // key is GroupID
    // TODO: finish this
    [key: string]: Profile[];
  };
}

export interface AddGroupAction {
  type: typeof ADD_GROUP;
  groupData: GroupConversation;
  membersProfile: {
    [key: string]: Profile;
  };
}

export interface AddGroupMembersAction {
  type: typeof ADD_MEMBERS;
  updateGroupMembersData: UpdateGroupMembersData;
  membersUsernames: {
    [key: string]: Profile;
  };
}

export interface RemoveGroupMembersAction {
  type: typeof REMOVE_MEMBERS;
  updateGroupMembersData: UpdateGroupMembersData;
}

export interface UpdateGroupNameAction {
  type: typeof UPDATE_GROUP_NAME;
  updateGroupNameData: UpdateGroupNameData;
}

export interface SetGroupMessageAction {
  type: typeof SET_GROUP_MESSAGE;
  groupMessage: GroupMessage;
  fileBytes?: Uint8Array;
}

export interface SetNextBatchGroupMessagesAction {
  type: typeof SET_NEXT_BATCH_GROUP_MESSAGES;
  groupMessagesOutput: GroupMessagesOutput;
  // for ease of retrieving groupID
  groupId: string;
}

export interface SetMessagesByGroupByTimestampAction {
  type: typeof SET_MESSAGES_BY_GROUP_BY_TIMESTAMP;
  groupMessagesOutput: GroupMessagesOutput;
  groupId: string;
}

export interface SetLatestGroupState {
  type: typeof SET_LATEST_GROUP_STATE;
  groups: GroupConversation[];
  groupMessagesOutput: GroupMessagesOutput;
  members: Profile[];
}

export interface SetLatestGroupVersionAction {
  type: typeof SET_LATEST_GROUP_VERSION;
  groupData: GroupConversation;
  groupMessagesOutput: GroupMessagesOutput;
  membersUsernames: {
    [key: string]: Profile;
  };
}

export interface SetGroupTyingIndicator {
  type: typeof SET_GROUP_TYPING_INDICATOR;
  GroupTyingIndicator: GroupTypingDetail;
}

export interface SetGroupReadMessage {
  type: typeof SET_GROUP_READ_MESSAGE;
  GroupReadMessage: GroupMessageReadDetail;
}

export interface SetFilesBytes {
  type: typeof SET_FILES_BYTES;
  filesBytes: {
    [key: string]: Uint8Array;
  };
}

export type GroupConversationsActionTypes =
  | AddGroupAction
  | AddGroupMembersAction
  | RemoveGroupMembersAction
  | UpdateGroupNameAction
  | SetGroupMessageAction
  | SetNextBatchGroupMessagesAction
  | SetMessagesByGroupByTimestampAction
  | SetLatestGroupState
  | SetLatestGroupVersionAction
  | SetFilesBytes
  | SetLatestGroupVersionAction
  | SetGroupTyingIndicator
  | SetGroupReadMessage;
