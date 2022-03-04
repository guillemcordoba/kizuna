import { serializeHash } from "@holochain-open-dev/core-types";
import { timestampToDate } from "../../../../utils/services/DateService";
import { ThunkAction } from "../../../types";
import { appendReceipt } from "../appendReceipt";

const receiveP2PReceipt =
  (payload: any): ThunkAction =>
  async (dispatch, getState, { callZome }) => {
    let receiptHash = Object.keys(payload.receipt)[0];

    let messageIDs: string[] = [];
    payload.receipt[receiptHash].id.forEach((id: Uint8Array) => {
      messageIDs.push(serializeHash(id));
    });

    let p2pReceipt = {
      p2pMessageReceiptEntryHash: receiptHash,
      p2pMessageEntryHashes: messageIDs,
      timestamp: timestampToDate(payload.receipt[receiptHash].status.timestamp),
      status: payload.receipt[receiptHash].status.status,
    };

    dispatch(appendReceipt(p2pReceipt));
  };

export default receiveP2PReceipt;
