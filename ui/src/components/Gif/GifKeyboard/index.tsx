import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  IonGrid,
  IonRow,
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonCol,
  IonCard,
  IonCardHeader,
  IonImg,
  IonSearchbar,
} from "@ionic/react";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/types";
import { getGifs } from "../../../redux/gif/actions/getGifs";
import styles from "./style.module.css";
import { useAppDispatch } from "../../../utils/helpers";
import Spinner from "../../../components/Spinner";
import GifSearchBox from "../GifSearchBox";
import { getGifsState } from "../../../redux/gif/actions/getGifsState";
import { returnValue } from "../../../redux/gif/types";

export interface FileContent {
  metadata: {
    fileName: string;
    fileType: "VIDEO" | "IMAGE" | "OTHER";
    fileSize: number;
  };
  fileType: {
    type: "VIDEO" | "IMAGE" | "OTHER";
    payload?: { thumbnail: Uint8Array };
  };
  fileBytes: Uint8Array;
}

export interface MessageInputOnSendParams {
  message?: string;
  files?: FileContent[];
  reply?: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// export interface MessageInputMethods {
//   reply: (message: { payload: Payload; author: string; id: string }) => any;
// }

interface Props {
  onChange?: (message: string) => any;
  onSend?: (opt?: MessageInputOnSendParams) => any;
  onSelect?: (message: string) => any;
}

const GifKeyboard: React.FC<Props> = ({ onSend, onChange, onSelect }) => {
  const dispatch = useAppDispatch();
  const [searchText, setSearchText] = useState("");
  const [selectedGif, setSelectedGif] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [next, setNext] = useState<any>(undefined);

  const handleOnChange = (e: CustomEvent) => setSearchText(e.detail.value!);

  const handleOnClick = (url: string) => {
    setSelectedGif(url);
  };

  const handleOnScrollBottom = (complete: () => Promise<void>) => {
    dispatch(getGifs(searchText, next)).then((res: any) => {
      setGifs(gifs.concat(...res.gifs));
      setNext(res.next);
    });
    complete();
  };

  const onChangeCallback = useCallback(() => {
    if (onSelect) onSelect(selectedGif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGif]);

  useEffect(() => {
    dispatch(getGifs(searchText)).then((res: any) => {
      setGifs(res.gifs);
      setNext(res.next);
    });
    dispatch(getGifsState()).then((res: any[]) => setGifs(res));
  }, [searchText]);

  useEffect(() => onChangeCallback(), [selectedGif, onChangeCallback]);

  const infiniteGifScroll = useRef<HTMLIonInfiniteScrollElement>(null);
  const complete: () => any = () => infiniteGifScroll.current?.complete();

  const renderGif = () =>
    Object.values(gifs).map((gif: any) => {
      return (
        <React.Fragment key={gif.id}>
          <IonCol size="3">
            <IonCard
              className={styles.mediacard}
              onClick={() => handleOnClick(gif.media[0].gif.url)}
            >
              <IonImg
                src={
                  gif.media[0].tinygif.preview
                    ? gif.media[0].nanogif.url
                    : gif.media[0].gif.preview
                }
              />
            </IonCard>
          </IonCol>
        </React.Fragment>
      );
    });

  return (
    <IonCard className={styles.card}>
      <IonCardHeader>
        <IonSearchbar
          value={searchText}
          onIonChange={handleOnChange}
          debounce={2000}
        ></IonSearchbar>
      </IonCardHeader>

      <IonContent className={styles.box}>
        {gifs && Object.values(gifs).length > 0 ? (
          <IonGrid>
            <IonRow className={styles.mediarow}>{renderGif()}</IonRow>
            <IonInfiniteScroll
              ref={infiniteGifScroll}
              position="bottom"
              onIonInfinite={(e) => {
                handleOnScrollBottom(complete);
                console.log("scrolls", e);
              }}
            >
              <IonInfiniteScrollContent loadingSpinner="circles"></IonInfiniteScrollContent>
            </IonInfiniteScroll>
          </IonGrid>
        ) : (
          <Spinner />
        )}
      </IonContent>
    </IonCard>
  );
};

export default GifKeyboard;
