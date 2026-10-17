import { InitTextMsg } from 'src/app/models/activity.model';

// How an initial text message reads once the sender/receiver names are filled in
export function formatInitTextPreview(item: InitTextMsg, firstName: string): string {
  var preview = item.msg;
  if(!item.sendSenderName && item.sendReceiverName) preview = `Hello 'receiver', ${item.msg}`;
  if(item.sendSenderName && item.sendReceiverName) preview = `Hello 'receiver', this is ${firstName} ${item.msg}`;
  if(item.sendSenderName && !item.sendReceiverName) preview = `This is ${firstName} ${item.msg}`;

  // Image-only messages have no text, so drop the dangling greeting punctuation
  if(!item.msg){
    preview = preview.replace(/[,\s]+$/, '');
    if(item.attachImage) preview = preview ? `${preview} (image only)` : '(image only)';
  }
  return preview;
}

// First name as it appears in previews ("oscar" -> "Oscar")
export function sessionFirstName(): string {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const firstName: string = user?.name?.firstName || ''
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
}
