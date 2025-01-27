import { serializeHash } from "@holochain-open-dev/core-types";
import { FUNCTIONS, ZOMES } from "../../utils/services/HolochainService/types";
import { timestampToDate } from "../../utils/services/DateService";
import { SET_BLOCKED, SET_CONTACTS } from "../contacts/types";
import { pushError } from "../error/actions";
import { convertFetchedResToGroupMessagesOutput } from "../group/actions/helpers";
import {
  GroupConversation,
  GroupMessagesOutput,
  SetLatestGroupState,
  SET_LATEST_GROUP_STATE,
} from "../group/types";
import { transformZomeDataToUIData } from "../p2pmessages/actions/helpers/transformZomeDateToUIData";
import { setMessages } from "../p2pmessages/actions/setMessages";
import { SET_PREFERENCE } from "../preference/types";
import {
  Profile,
  ProfileRaw,
  ProfileActionTypes,
  SET_PROFILE,
} from "../profile/types";
import { ThunkAction } from "../types";
import {
  binaryToUrl,
  getEntryFromRecord,
} from "../../utils/services/ConversionService";
import { decode } from "@msgpack/msgpack";

export const getLatestData =
  (): ThunkAction =>
  async (dispatch, getState, { callZome, getAgentId }) => {
    try {
      console.log("getting latest data");
      // TODO: error handling
      const latestData = await callZome({
        zomeName: ZOMES.AGGREGATOR,
        fnName: FUNCTIONS[ZOMES.AGGREGATOR].RETRIEVE_LATEST_DATA,
      });

      console.log("latest data ", latestData);

      // const myAgentId = await getAgentId();
      // /* assume that getAgentId() is non-nullable */
      // const myAgentIdB64 = serializeHash(myAgentId!);

      const userInfoProfileRaw = decode(
        getEntryFromRecord(latestData.userInfo)
      ) as ProfileRaw;
      dispatch<ProfileActionTypes>({
        type: SET_PROFILE,
        id: serializeHash(
          latestData.userInfo.signed_action.hashed.content.author
        ),
        nickname: userInfoProfileRaw.nickname,
        fields: userInfoProfileRaw.fields.avatar
          ? { avatar: binaryToUrl(userInfoProfileRaw.fields.avatar) }
          : {},
      });

      let contacts: { [key: string]: Profile } = {};
      let blocked: { [key: string]: Profile } = {};
      latestData.addedProfiles.forEach((rec: any) => {
        const raw = decode(getEntryFromRecord(rec)) as ProfileRaw;
        const id = serializeHash(rec.signed_action.hashed.content.author);
        contacts[id] = {
          id,
          username: raw.nickname,
          fields: raw.fields.avatar
            ? { avatar: binaryToUrl(raw.fields.avatar) }
            : {},
        };
      });

      if (latestData.blockedProfiles)
        latestData.blockedProfiles.forEach((rec: any) => {
          const raw = decode(getEntryFromRecord(rec)) as ProfileRaw;
          const id = serializeHash(rec.signed_action.hashed.content.author);
          blocked[id] = {
            id,
            username: raw.nickname,
            fields: raw.fields.avatar
              ? { avatar: binaryToUrl(raw.fields.avatar) }
              : {},
          };
        });

      dispatch({
        type: SET_CONTACTS,
        contacts,
      });

      dispatch({
        type: SET_BLOCKED,
        blocked,
      });

      // TODO: store per agent and group prefenrece as well
      dispatch({
        type: SET_PREFERENCE,
        preference: {
          readReceipt: latestData.globalPreference.readReceipt,
          typingIndicator: latestData.globalPreference.typingIndicator,
        },
      });
      const groupMessagesOutput: GroupMessagesOutput =
        convertFetchedResToGroupMessagesOutput(latestData.latestGroupMessages);

      const groups: GroupConversation[] = latestData.groups.map(
        (group: any): GroupConversation => ({
          originalGroupId: serializeHash(group.groupId),
          originalGroupRevisionId: serializeHash(group.groupRevisionId),
          name: group.latestName,
          members: group.members.map((id: Buffer) => serializeHash(id)),
          createdAt: timestampToDate(group.created),
          creator: serializeHash(group.creator),
          messages:
            groupMessagesOutput.messagesByGroup[serializeHash(group.groupId)],
          pinnedMessages: [],
          avatar: group.avatar,
        })
      );

      const groupMembers: Profile[] = latestData.memberProfiles.map(
        (rec: any): Profile => {
          const raw = decode(getEntryFromRecord(rec)) as ProfileRaw;
          const id = serializeHash(rec.signed_action.hashed.content.author);
          return {
            id,
            username: raw.nickname,
            fields: raw.fields.avatar
              ? { avatar: binaryToUrl(raw.fields.avatar) }
              : {},
          };
        }
      );

      // console.log("latest groups", groups);
      // console.log("latest group messages", groupMessagesOutput);
      // console.log("latest group members", groupMembers);

      // let groups: GroupConversation[] = groups;
      // let groupMessagesOutput: GroupMessagesOutput = action.groupMessagesOutput;

      let conversations = getState().groups.conversations;
      groups.forEach((group: GroupConversation) => {
        conversations[group.originalGroupId] = group;
      });

      let messages = getState().groups.messages;
      messages = {
        ...messages,
        ...groupMessagesOutput.groupMessagesContents,
      };

      let members = getState().groups.members;
      groupMembers.forEach((member: Profile) => {
        members[member.id] = member;
      });

      dispatch<SetLatestGroupState>({
        type: SET_LATEST_GROUP_STATE,
        messages,
        conversations,
        members,
      });

      const contactsState = { ...getState().contacts.contacts };
      const profile = { ...getState().profile };
      const profileList = {
        ...contactsState,
        [profile.id!]: {
          id: profile.id!,
          username: profile.username!,
          fields: profile.fields,
        },
      };
      const toDispatch = transformZomeDataToUIData(
        latestData.latestP2pMessages,
        profileList
      );
      // console.log("latest p2p messages", toDispatch);
      dispatch(setMessages(toDispatch));

      return null;
    } catch (e) {
      console.log(e);
      dispatch(
        pushError("TOAST", {}, { id: "redux.err.commons-get-latest-data" })
      );
    }
  };
