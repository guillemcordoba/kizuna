import { AgentPubKey } from "@holochain/conductor-api";
import React, { useEffect, useState } from "react";
import { IonLoading } from "@ionic/react";
import { useSelector } from "react-redux";
import { useIntl } from "react-intl";

// Redux
import {
  GroupMessage,
  GroupMessageReadData,
  GroupMessagesContents,
  GroupMessagesOutput,
} from "../../../redux/group/types";
import { readGroupMessage } from "../../../redux/group/actions/readGroupMessage";
import { getNextBatchGroupMessages } from "../../../redux/group/actions/getNextBatchGroupMessages";
import { fetchFilesBytes } from "../../../redux/group/actions/setFilesBytes";
import { RootState } from "../../../redux/types";
import { FilePayload } from "../../../redux/commons/types";
import { getAgentId } from "../../../redux/profile/actions";

// Components
import Chat from "../../../components/Chat";
import { ChatListMethods } from "../../../components/Chat/types";

import {
  deserializeAgentPubKey,
  isTextPayload,
  useAppDispatch,
} from "../../../utils/helpers";
import { deserializeHash, serializeHash } from "@holochain-open-dev/core-types";

interface Props {
  messageIds: string[];
  members: string[];
  groupId: string;
  // TODO: not really sure what type this is
  chatList: React.RefObject<ChatListMethods>;
}
const MessageList: React.FC<Props> = ({
  messageIds,
  members,
  chatList,
  groupId,
}) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  // LOCAL STATE
  const [messages, setMessages] = useState<any[]>([]);
  const [myAgentId, setMyAgentId] = useState<string>("");
  const [oldestFetched, setOldestFetched] = useState<boolean>(false);
  const [oldestMessage, setOldestMessage] = useState<any>();
  const [newestMessage, setNewestMessage] = useState<GroupMessage>();
  const [loading, setLoading] = useState<boolean>(false);

  const allMessages = useSelector((state: RootState) => state.groups.messages);
  const allMembers = useSelector((state: RootState) => state.groups.members);
  const username = useSelector((state: RootState) => state.profile.username);
  const messagesData = useSelector((state: RootState) => {
    let uniqueArray = messageIds.filter(function (item, pos, self) {
      return self.indexOf(item) === pos;
    });
    const messages: (any | undefined)[] = uniqueArray
      ? uniqueArray.map((messageId) => {
          let message: GroupMessage = state.groups.messages[messageId];
          if (message) {
            const authorProfile = allMembers[message.author];

            let payload = message.payload;

            if (!isTextPayload(payload)) {
              payload = payload as FilePayload;

              if (state.groups.groupFiles["u" + payload.fileHash]) {
                payload = {
                  ...payload,
                  fileHash: payload.fileHash,
                };
              } else {
                dispatch(fetchFilesBytes([deserializeHash(payload.fileHash)]));
              }
            }
            return {
              ...message,
              payload,
              author: authorProfile
                ? authorProfile
                : // if profile was not found from allMembers, then the author is self
                  // assuming that allMembers have all the members of group at all times
                  {
                    username: username!,
                    id: message.author,
                  },
            };
          }
          return null;
        })
      : [];

    // TODO: handle fetching of missing messages (most likely won't occur)
    if (messages.find((message) => message === null)) return null;
    messages.sort((x, y) => {
      return x.timestamp.valueOf()[0] - y.timestamp.valueOf()[0];
    });
    return messages;
  });

  const handleOnScrollTop = (complete: any) => {
    setLoading(true);
    if (messagesData?.length) {
      let lastMessage = messagesData![0];
      dispatch(
        getNextBatchGroupMessages({
          groupId: deserializeHash(groupId),
          // the entry hash of the last message in the last batch fetched
          lastFetched: oldestMessage
            ? deserializeHash(oldestMessage.groupMessageEntryHash)
            : deserializeHash(lastMessage.groupMessageEntryHash),
          // 0 - seconds since epoch, 1 - nanoseconds. See Timestamp type in hdk doc for more info.
          lastMessageTimestamp: lastMessage.timestamp,
          batchSize: 10,
          payloadType: { type: "ALL", payload: null },
        })
      ).then((res: GroupMessagesOutput) => {
        if (Object.keys(res.groupMessagesContents).length !== 0) {
          let groupMesssageContents: GroupMessagesContents =
            res.groupMessagesContents;
          const fetchedMessages: (any | undefined)[] = [];
          Object.keys(groupMesssageContents).forEach((key: any) => {
            const authorProfile = allMembers[groupMesssageContents[key].author];
            fetchedMessages.push({
              ...groupMesssageContents[key],
              author: authorProfile
                ? authorProfile
                : // if profile was not found from allMembers, then the author is self
                  // assuming that allMembers have all the members of group at all times
                  {
                    username: username!,
                    id: groupMesssageContents[key].author,
                  },
            });
          });
          let newMessages = [...messages, ...fetchedMessages];
          newMessages.sort((x, y) => {
            return x.timestamp.valueOf()[0] - y.timestamp.valueOf()[0];
          });
          let newOldestMessage =
            res.groupMessagesContents[
              res.messagesByGroup[groupId][
                res.messagesByGroup[groupId].length - 1
              ]
            ];
          setOldestMessage(newOldestMessage);
          setMessages(newMessages);
          setLoading(false);
        } else {
          setOldestFetched(true);
          setLoading(false);
        }
      });
    }

    complete();
    return null;
  };

  useEffect(() => {
    setMessages(messagesData!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageIds]);

  useEffect(() => {
    let maybeThisGroupNewestMessageKey =
      Object.keys(allMessages)[Object.keys(allMessages).length - 1];
    let maybeThisGroupNewestMessage =
      allMessages[maybeThisGroupNewestMessageKey];
    if (maybeThisGroupNewestMessageKey) {
      if (
        maybeThisGroupNewestMessage.groupEntryHash === groupId &&
        maybeThisGroupNewestMessage.groupMessageEntryHash !==
          newestMessage?.groupMessageEntryHash
      ) {
        setNewestMessage(maybeThisGroupNewestMessage);
      }
    }
  }, [allMessages, groupId, newestMessage?.groupMessageEntryHash]);

  useEffect(() => {
    if (newestMessage) {
      const authorProfile = allMembers[newestMessage.author];
      messages.push({
        ...newestMessage,
        author: authorProfile
          ? authorProfile
          : // if profile was not found from allMembers, then the author is self
            // assuming that allMembers have all the members of group at all times
            {
              username: username!,
              id: newestMessage.author,
            },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessage]);

  const filesBytes = useSelector((state: RootState) => state.groups.groupFiles);

  const onDownload = (file: FilePayload) => {
    const fileBytes = filesBytes[`u${file.fileHash}`];
    if (fileBytes) {
      const blob = new Blob([fileBytes]); // change resultByte to bytes
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = file.fileName;
      link.click();
    } else {
      dispatch(fetchFilesBytes([deserializeHash(file.fileHash)])).then(
        (res: any) => {
          if (res) {
            const fetchedFileBytes = res[`u${file.fileHash}`];
            const blob = new Blob([fetchedFileBytes]); // change resultByte to bytes
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = file.fileName;
            link.click();
          }
        }
      );
    }
  };

  return (
    <>
      <IonLoading
        isOpen={loading}
        message={intl.formatMessage({ id: "app.group-chat.fetching" })}
      />
      <Chat.ChatList
        disabled={oldestFetched}
        onScrollTop={(complete) => handleOnScrollTop(complete)}
        ref={chatList}
        type="group"
      >
        {messages!.map((message, i) => {
          if (message.author.id === myAgentId)
            return (
              <Chat.Me
                // key={message.groupMessageEntryHash}
                onDownload={onDownload}
                key={i}
                author={message.author.username}
                timestamp={new Date(message.timestamp[0] * 1000)}
                payload={message.payload}
                readList={message.readList}
                type="group"
                showName={true}
                showProfilePicture={true}
              />
            );
          return (
            <Chat.Others
              // key={message.groupMessageEntryHash}
              onDownload={onDownload}
              key={i}
              author={message.author.username}
              timestamp={new Date(message.timestamp[0] * 1000)}
              payload={message.payload}
              readList={message.readList}
              type="group"
              showName={true}
              onSeen={(complete) => {
                dispatch(getAgentId()).then(
                  (myAgentPubKey: AgentPubKey | null) => {
                    setMyAgentId(serializeHash(myAgentPubKey!));
                    let read: boolean = Object.keys(message.readList).includes(
                      serializeHash(myAgentPubKey!)
                    );

                    if (!read) {
                      let groupMessageReadData: GroupMessageReadData = {
                        groupId: deserializeHash(groupId),
                        messageIds: [
                          deserializeHash(message.groupMessageEntryHash),
                        ],
                        reader: myAgentPubKey!,
                        timestamp: message.timestamp,
                        members: members.map((member: string) =>
                          deserializeAgentPubKey(member)
                        ),
                      };
                      dispatch(readGroupMessage(groupMessageReadData)).then(
                        (res: any) => {
                          complete();
                        }
                      );
                    }
                  }
                );
                // TODO: This is only a temporary fix. The HashType should be changed to Agent in the hc side when ReadList is constrcuted
                // to avoid doing something like this in UI.
              }}
              showProfilePicture={true}
            />
          );
        })}
      </Chat.ChatList>
    </>
  );
};

export default MessageList;
