import {
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonLoading,
} from "@ionic/react";
import {
  peopleOutline,
  personAddOutline,
  removeCircleOutline,
} from "ionicons/icons";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";
import { useToast } from "../../../../containers/ToastContainer/context";

import { removeMembers } from "../../../../redux/group/actions";
import { GroupConversation } from "../../../../redux/group/types";
// Redux
import { Profile } from "../../../../redux/profile/types";
import { RootState } from "../../../../redux/types";
import { useAppDispatch } from "../../../../utils/services/ReduxService";
import AddMemberModal from "./AddMemberModal";
import styles from "./style.module.css";

interface Props {
  groupId: string;
  groupRevisionId: string;
}

const Members: React.FC<Props> = ({ groupId, groupRevisionId }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const { showErrorToast } = useToast();

  /* Local state */
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [members, setMembers] = useState<Profile[]>([]);

  /* Selectors */
  const contacts = useSelector((state: RootState) => state.contacts.contacts);
  const profile = useSelector((state: RootState) => state.profile);
  const groupMembers = useSelector((state: RootState) => state.groups.members);
  const groupData = useSelector(
    (state: RootState) => state.groups.conversations[groupId]
  );

  /* Handlers */
  const handleRemoveMembers = (memberProfile: Profile) => {
    setLoading(true);
    /* err if member is being removed when total member <= 2 */
    if (groupData.members.length <= 2) {
      setLoading(false);
      showErrorToast({
        message: intl.formatMessage({
          id: "app.group-chat.minimum-member-required-reached",
        }),
      });
      return null;
    }

    let input = {
      members: [memberProfile.id],
      groupId: groupData.originalGroupId,
      groupRevisionId: groupData.originalGroupRevisionId,
    };
    dispatch(removeMembers(input)).then((res: any) => {
      if (res !== false) {
        let newMembers = members.filter((x) => !res.members.includes(x.id));
        setMembers(newMembers);
      }
      setLoading(false);
    });
  };

  /* Use Effects */
  useEffect(() => {
    let membersProfile: Profile[] = [];
    let members = [...groupData.members, groupData.creator];

    // We include the creator in the membersProfile here
    members.forEach((member: string) => {
      if (groupMembers[member]) membersProfile.push(groupMembers[member]);
    });

    setMembers(membersProfile);
    setLoading(false);
  }, [groupData, groupMembers]);

  /* Renderer */
  const renderNoOfMembers = () => (
    <IonItem lines="none">
      <IonIcon className={styles.icon} icon={peopleOutline}></IonIcon>
      <IonLabel>
        {intl.formatMessage(
          { id: "app.group-chat.members" },
          { length: members.length }
        )}
      </IonLabel>
    </IonItem>
  );

  const renderAddMemberButton = (groupData: GroupConversation) => {
    return profile.id === groupData.creator ? (
      <IonItem lines="none" button onClick={() => setIsOpen(true)}>
        <IonIcon className={styles.icon} icon={personAddOutline}></IonIcon>
        <IonLabel>
          {intl.formatMessage({ id: "app.group-chat.add-members" })}
        </IonLabel>
      </IonItem>
    ) : null;
  };

  /* This is a version of remove member that is a button */
  const renderRemoveMemberButton = (member: Profile) => {
    /*
      - check that the agent is a creator 
      - check also that the remove button will not appear to self
    */
    return profile.id === groupData.creator &&
      member.id !== groupData.creator ? (
      <IonItem
        lines="none"
        slot="end"
        button
        onClick={() => handleRemoveMembers(member)}
      >
        <IonIcon color="danger" icon={removeCircleOutline} />
      </IonItem>
    ) : null;
  };

  /* This is a version of remove member that is a slide (currently unused) */
  // const renderRemoveMemberSlide = (member: Profile) => {
  //   return (myAgentId === groupData.creator && member.id !== groupData.creator) ? (
  //     <IonItemOptions side={"end"}>
  //       <IonItemOption onClick={() => handleRemoveMembers(member)} color="danger">
  //         {intl.formatMessage({id: "app.group-chat.remove-member"})}
  //       </IonItemOption>
  //     </IonItemOptions>
  //   ) : null
  // }

  /*
    Currently, we are rending a button for remove member feature
    TODO: Discuss and decide whether we will use button or slide for remove member
    What would be nice is for us to use button for browser and slide for mobile app maybe.
  */
  const renderGroupMembers = (members: Profile[]) =>
    members.map((member: Profile) => {
      let isCreator = member.id === groupData.creator;
      /* 
      Uncomment IonItemSliding and renderRemoveMemberSlide(member) and comment out 
      renderRemoveMemberButton(member) to change to slide
    */
      return (
        // <IonItemSliding>
        <IonItem lines="none" key={member.id}>
          <IonLabel className={styles["member-name"]}>
            {member.username}
            <br />
            {isCreator
              ? intl.formatMessage({ id: "app.group-chat.admin-role" })
              : intl.formatMessage({ id: "app.group-chat.member-role" })}
          </IonLabel>
          {renderRemoveMemberButton(member)}
          {/* {renderRemoveMemberSlide(member)} */}
        </IonItem>
        // </IonItemSliding>
      );
    });

  return (
    <>
      {!loading ? (
        <>
          <IonItemGroup className={styles["member-page"]}>
            {renderNoOfMembers()}
            {renderAddMemberButton(groupData)}

            <IonItem lines="none" className={styles["member-title"]}>
              <h3>
                {intl.formatMessage({ id: "app.group-chat.members-label" })}
              </h3>
            </IonItem>

            {renderGroupMembers(members)}
          </IonItemGroup>
        </>
      ) : (
        <IonLoading isOpen={loading} />
      )}

      <AddMemberModal
        contacts={contacts}
        members={members}
        setMembers={setMembers}
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        groupId={groupId}
        groupRevisionId={groupRevisionId}
        setLoading={setLoading}
      />
    </>
  );
};

export default Members;
