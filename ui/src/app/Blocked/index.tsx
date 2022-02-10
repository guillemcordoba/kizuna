import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
} from "@ionic/react";
import { arrowBackSharp } from "ionicons/icons";
import React from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router";
import ContactsList from "../../components/ContactList";
import { RootState } from "../../redux/types";
import { indexContacts } from "../../utils/helpers";
import EmptyBlocked from "./EmptyBlocked";

const Blocked = () => {
  const history = useHistory();
  const blocked = useSelector((state: RootState) =>
    Object.values(state.contacts.blocked)
  );

  const indexedContacts = indexContacts(Object.values(blocked));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              onClick={() => history.push({ pathname: `/home` })}
              className="ion-no-padding"
            >
              <IonIcon slot="icon-only" icon={arrowBackSharp} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {Object.values(blocked).length !== 0 ? (
          <ContactsList contacts={indexedContacts ? indexedContacts : {}} />
        ) : (
          <EmptyBlocked />
        )}
      </IonContent>
    </IonPage>
  );
};

export default Blocked;
