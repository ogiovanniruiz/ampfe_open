import { InitTextMsg } from '../models/activity.model';

export const EMPTY_INIT_TEXT_MSG: InitTextMsg = {msg: '', sendSenderName: false, sendReceiverName: false, attachImage: false, imageUrl: ''}

const capitalize = (name: string = '') => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

// The opening text as sent: optional "Hello {receiver}," and "this is {sender}" around the activity's message.
// Shared by textbanks, singular texts and the test-text dialog so they always match.
export function buildInitTextMsg(initTextMsg: InitTextMsg, senderFirstName: string, receiverFirstName: string): string {
  const message = initTextMsg?.msg || ''
  let fullInitTextMsg: string = message

  const sender = capitalize(senderFirstName)
  const receiver = capitalize(receiverFirstName)

  if(initTextMsg?.sendSenderName && initTextMsg?.sendReceiverName){
    fullInitTextMsg = "this is " + sender + fullInitTextMsg
  }

  if(initTextMsg?.sendSenderName && !initTextMsg?.sendReceiverName){
    fullInitTextMsg = "This is " + sender + " " + fullInitTextMsg
  }

  if(initTextMsg?.sendReceiverName){
    fullInitTextMsg = "Hello " + receiver + ", " + fullInitTextMsg
  }

  // Image-only messages have no text, so drop the dangling greeting punctuation
  if(!message){
    fullInitTextMsg = fullInitTextMsg.replace(/[,\s]+$/, '')
  }

  return fullInitTextMsg
}
