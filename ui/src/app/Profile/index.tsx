import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonModal,
} from "@ionic/react";
import {
  arrowBackSharp,
  imageOutline,
  peopleCircleOutline,
} from "ionicons/icons";
import React, { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useHistory, useLocation } from "react-router";
import Identicon from "../../components/Identicon";
import ImageCropper from "../../components/ImageCropper";
import ProfileInfo from "../../components/ProfileInfo";
import updateAvatar from "../../redux/profile/actions/updateAvatar";
import { Profile as ProfileType } from "../../redux/profile/types";
import { useAppDispatch } from "../../utils/helpers";
import ProfileMenuItems from "./ProfileMenuItems";
import styles from "./style.module.css";

interface LocationProps {
  prev: string;
  profile: ProfileType;
}

const Profile: React.FC = () => {
  const _isMounted = useRef(true);
  const { state } = useLocation<LocationProps>();
  const history = useHistory();
  const [profile, setProfile] = useState<null | ProfileType>(null);
  const [binary, setBinary] = useState<Uint8Array | null>(null);
  const dispatch = useAppDispatch();

  const onDismiss = () => {
    setBinary(null);
    dismiss();
  };

  const decodeSrc = () => {
    const decoder = new TextDecoder();

    return binary ? decoder.decode(binary) : "";
  };
  const [present, dismiss] = useIonModal(ImageCropper, {
    src: decodeSrc(),
    prevPath: "/",
    dismiss: onDismiss,
    onComplete: (binary: Uint8Array) => {
      if (binary) {
        const blob = new Blob([binary], { type: "image/jpeg" });
        dispatch(updateAvatar(binary));
        img.current!.src = URL.createObjectURL(blob);
        setBinary(binary);
      }
    },
  });
  useEffect(() => {
    if (binary) present({ cssClass: `cropper ${styles.modal}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binary]);
  // const [loading, setLoading] = useState(false);

  useEffect(() => {
    _isMounted.current = true;
    return () => {
      _isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setProfile(state.profile);
  }, [state?.profile]);

  const file = useRef<HTMLInputElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const intl = useIntl();

  const handleOnFileChange = () => {
    Array.from(file.current ? file.current.files! : new FileList()).forEach(
      (file) => {
        file.arrayBuffer().then((arrBuffer) => {
          const fileSize = file.size;
          const fileName = file.name;
          // 15mb = 15728640b, file.size is of type bytes
          if (fileSize < 15728640) {
            const encoder = new TextEncoder();
            const reader = new FileReader();

            reader.readAsDataURL(file);
            reader.onload = (readerEvent) => {
              const encoded = encoder.encode(
                readerEvent.target?.result as string
              );

              setBinary(encoded);
            };
          }
        });
      }
    );
  };
  console.log(profile?.fields.avatar, profile);
  return (
    <IonPage>
      <IonHeader className={styles.header}>
        <IonToolbar>
          <IonButtons>
            <IonButton
              onClick={() =>
                history.push({
                  pathname: state?.prev ? state.prev : "/home/contacts",
                })
              }
              className="ion-no-padding"
            >
              <IonIcon slot="icon-only" icon={arrowBackSharp} />
            </IonButton>
          </IonButtons>
          {profile ? <ProfileMenuItems profile={profile} /> : null}
        </IonToolbar>

        <div className={styles["profile-picture-toolbar"]}>
          <div className={styles["toolbar-container"]}>
            {profile ? (
              <div className={styles["avatar-content"]}>
                <div className={styles["avatar"]}>
                  <div className={styles["image-container"]}>
                    {profile.fields.avatar ? (
                      <img ref={img} src={profile.fields.avatar} />
                    ) : (
                      <Identicon size={100} hash={profile.id}></Identicon>
                    )}
                  </div>
                  <div
                    onClick={() => file.current?.click()}
                    className={styles.overlay}
                  >
                    <IonText className="ion-text-center">
                      {intl.formatMessage({
                        id: "app.group-chat.change-avatar",
                      })}
                    </IonText>
                  </div>
                </div>
                <div className={styles["icon-overlay"]}>
                  <IonIcon size="large" icon={imageOutline}></IonIcon>
                </div>
                <input
                  ref={file}
                  type="file"
                  hidden
                  accept="image/png, image/jpeg"
                  onChange={handleOnFileChange}
                />
              </div>
            ) : null}
          </div>
        </div>
        <IonToolbar className={styles["profile-toolbar"]}>
          <IonTitle className={styles["nickname"]}>
            {profile ? profile.username : ""}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <ProfileInfo id={state.profile.id} nickname={state.profile.username} />
    </IonPage>
  );
};

export default Profile;
