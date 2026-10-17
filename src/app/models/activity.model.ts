import { Location } from "./person.model";
import { User } from "./user.model";


export class Activity {
    _id?: string;
    name!: string;
    activityType!: string;
    description!: string;
    active!: boolean;
    groupID?: string;
    campaignID!: number;
    orgIDs!: string[];
    userIDs!: string[];
    nonResponseSetID?: string;
    surveyID!: string;
    textMetaData?: TextMetaData;
    enableTexting!: boolean;
    optinOption?: boolean;
    passes!: number;
    idBy?: string;
    hhReady!: boolean;
    patchThroughNumber?: string;
    scriptLink?: boolean;
    petitionMetadata?: PetitionMetadata;
    notes!: string;
    complete!: boolean;
    questionsToHide!: string[];
    tagsToHide?: string[];
}

export class TextMetaData {
    initTextMsgs!: InitTextMsg[];
    defaultInitTextMsg?: InitTextMsg;
    quickResponses!: string[];
    textingCampaignID!: string;
    activityPhonenumber!: string;
}


export class PetitionMetadata {
    checkVoterfile!: boolean;
    requireFullAddress!: boolean;
    requireEmail!: boolean;
    includeAddress?: boolean;
    requireAddress?: boolean;
    includeEmail?: boolean;
}

export class CallPool{
    orgID!: string
    number!: string;
    available!: boolean;
    dateUpdated!: Date;
}

export class CanvasserLocations{
    user!: User;
    location!: Location;
    activityID!: string;
    dateUpdated!: Date;
}

export class SingularTextResult{
    status!: boolean;
    message!: string;
}

export class InitTextMsg {
    msg!: string;
    sendSenderName!: boolean;
    sendReceiverName!: boolean;
    attachImage!: boolean;
    imageUrl!: string;
}

export class TextingTemplate {
    _id?: string;
    name!: string;
    campaignID!: number;
    orgID!: string;
    initTextMsgs!: InitTextMsg[];
    quickResponses!: string[];
}