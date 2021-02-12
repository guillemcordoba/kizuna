#![allow(unused_imports)]
use file_types::FileMetadata;
use group::Group;
use hdk3::{host_fn::remote_signal, prelude::*};
use link::Link;


//LIST OF DEPENDENCIES ADDED FOR MANUEL 
use std::collections::hash_map::HashMap;
use super::{
    GroupMsgBatchFetchFilter,
    MessagesByGroup,
    GroupEntryHash,
    GroupMessageHash,
    GroupMessageContent,
};
//END LIST OF DEPENDENCIES ADDED FOR MANUEL 


use crate::{
    entries::group::{self, handlers::get_group_latest_version},
    signals::{SignalDetails, SignalName, SignalPayload},
    utils::{collect, path_from_str, timestamp_to_days, to_timestamp},
};

use super::{
    GroupChatFilter, GroupFileBytes, GroupMessage, GroupMessageData, GroupMessageDataWrapper,
    GroupMessageInput, GroupMessageReadData, GroupTypingDetailData, Payload, PayloadInput,
};

pub fn send_message(message_input: GroupMessageInput) -> ExternResult<GroupMessageData> {
    let payload_res = match message_input.clone().payload {
        PayloadInput::Text { payload } => Ok(Payload::Text { payload }),
        PayloadInput::File {
            metadata,
            file_type,
            file_bytes,
        } => {
            let group_file_bytes = GroupFileBytes(file_bytes);
            create_entry(&group_file_bytes)?;
            match hash_entry(&group_file_bytes) {
                Ok(hash) => Ok(Payload::File {
                    file_type: file_type,
                    metadata: FileMetadata {
                        file_name: metadata.file_name,
                        file_size: metadata.file_size,
                        file_type: metadata.file_type,
                        file_hash: hash,
                    },
                }),
                Err(_) => Err(HdkError::Wasm(WasmError::Zome(
                    "Cannot hash file bytes".into(),
                ))),
            }
        }
    };

    match payload_res {
        Ok(payload) => {
            let message = GroupMessage {
                group_hash: message_input.clone().group_hash,
                // TODO: conver PayloadInput to Payload since GroupMessageInput has PayloadInput and not Payload.
                payload,
                created: to_timestamp(sys_time()?),
                sender: message_input.clone().sender,
                reply_to: message_input.clone().reply_to,
            };

            // commit GroupMessage entry
            create_entry(&message)?;

            let group_hash = message.clone().group_hash.to_string(); // message's group hash as string
            let days = timestamp_to_days(message.clone().created).to_string(); // group message's timestamp into days as string

            match path_from_str(&[group_hash, days].join(".")).hash() {
                Ok(hash) => {
                    create_link(
                        hash.clone(),
                        hash_entry(&message.clone())?,
                        LinkTag::new(match message.payload {
                            Payload::Text { payload: _ } => "text".to_owned(),
                            Payload::File {
                                metadata: _,
                                file_type: _,
                            } => "file".to_owned(),
                        }),
                    )?;

                    match get_group_latest_version(message.clone().group_hash) {
                        Ok(group) => {
                            let message_hash = hash_entry(&message.clone())?;
                            let group_message_data = GroupMessageData {
                                id: message_hash,
                                content: message,
                            };

                            // TODO: please use the SignalDetails format and add the GroupMessageData in the SignalPayload enum variant
                            // to have coherence in code.
                            let signal = SignalDetails {
                                name: SignalName::GROUP_MESSAGE_DATA.to_owned(),
                                payload: SignalPayload::GroupMessageData(
                                    group_message_data.clone(),
                                ),
                            };

                            remote_signal(
                                &signal,
                                [vec![group.clone().creator], group.clone().members]
                                    .concat()
                                    .into_iter()
                                    .filter_map(|agent| {
                                        if agent != message_input.clone().sender {
                                            Some(agent)
                                        } else {
                                            None
                                        }
                                    })
                                    .collect(),
                            )?;
                            Ok(group_message_data)
                        }
                        Err(_) => Err(HdkError::Wasm(WasmError::Zome(
                            "Cannot get group's latest version".into(),
                        ))),
                    }
                }
                Err(_) => Err(HdkError::Wasm(WasmError::Zome("Cannot create path".into()))),
            }
        }
        Err(_) => Err(HdkError::Wasm(WasmError::Zome(
            "Cannot convert payload input to payload".into(),
        ))),
    }
}

pub fn get_all_messages(group_hash: EntryHash) -> ExternResult<GroupMessageDataWrapper> {
    let path = Path::from(group_hash.clone().to_string());
    let result = get_links(path.hash()?, None)
        .and_then(|timestamp_links| {
            collect(timestamp_links.into_inner(), |timestamp_link| {
                get_links(timestamp_link.target, None)
            })
        })
        .and_then(|message_links| {
            collect(message_links, |message_link| {
                collect(message_link.into_inner(), |element_link| {
                    get(element_link.target, GetOptions::default())
                })
                .and_then(|elements| {
                    Ok(elements
                        .into_iter()
                        .filter_map(|element| match element {
                            Some(entry) => {
                                if let Ok(Some(message)) =
                                    entry.into_inner().1.to_app_option::<GroupMessage>()
                                {
                                    match hash_entry(&message.clone()) {
                                        Ok(hash) => {
                                            return Some(GroupMessageData {
                                                id: hash,
                                                content: message,
                                            });
                                        }
                                        Err(_) => None,
                                    }
                                } else {
                                    None
                                }
                            }
                            None => None,
                        })
                        .collect::<Vec<GroupMessageData>>())
                })
            })
        });

    match result {
        Ok(data) => Ok(GroupMessageDataWrapper(
            data.into_iter().flatten().collect(),
        )),
        Err(e) => Err(e),
    }
}

pub fn indicate_group_typing(group_typing_detail_data: GroupTypingDetailData) -> ExternResult<()> {
    let signal_detail: SignalDetails = SignalDetails {
        name: SignalName::GROUP_TYPING_DETAIL.to_owned(),
        payload: SignalPayload::GroupTypingDetail(group_typing_detail_data.clone()),
    };
    remote_signal(&signal_detail, group_typing_detail_data.members)?;
    Ok(())
}

pub fn read_group_message(
    group_message_read_data: GroupMessageReadData,
) -> ExternResult<GroupMessageReadData> {
    let my_agent_pubkey = agent_info()?.agent_latest_pubkey;
    for message_entry_hash in group_message_read_data.message_ids.clone() {
        // link GroupMessage -> AgentPubKey to indicate that it is read.
        create_link(
            message_entry_hash,
            my_agent_pubkey.clone().into(),
            LinkTag::new("read".to_owned()),
        )?;
    }
    let signal_detail = SignalDetails {
        name: SignalName::GROUP_MESSAGE_READ.to_owned(),
        payload: SignalPayload::GroupMessageRead(group_message_read_data.clone()),
    };
    remote_signal(&signal_detail, group_message_read_data.members.clone())?;
    Ok(group_message_read_data)
}

/*
pub struct GroupMsgBatchFetchFilter {
    group_id: EntryHash,
    // the last message of the last batch
    last_fetched: Option<EntryHash>,
    last_message_timestamp: Option<Timestamp>,
    // usize?
    batch_size: u8,
    payload_type: PayloadType,
}
*/



pub fn _get_next_batch_group_messages(filter: GroupMsgBatchFetchFilter) -> ExternResult<()> { //GroupMessagesOutput
    
    //pub struct MessagesByGroup(pub HashMap<_GroupEntryHash, Vec<_GroupMessageHash >>);
    //initialize MessagesByGroup (group_id as single key)

    let mut _messages_by_group: MessagesByGroup;
    let _group_id:GroupEntryHash = GroupEntryHash(filter.group_id.clone());

    //initialize GroupMessagesContents HashMap
    
    let mut _group_messages_contents: HashMap<GroupMessageHash, GroupMessageContent>;
    
    //constrcut path group_hash, Path::from(ENTRY_HASH.UNIX_TIMESTAMP_ON_UTC_FORMAT); (i assumme this path have to be created using the latest message timestamp)

    
    






    
    

    Ok(())
}
