import { Household, Person, Name} from './person.model'
import { NonResponseSet } from './nonResponseSet.model';
import { Survey } from './survey.model';
import { User } from './user.model';
import { Activity } from './activity.model';

export class ActivityContactRecord {
    _id?: string;
    personID!: string;
    person!: Person;
    userID!: string;
    user!: User;

    activityID!: string;
    orgID!: string;
    campaignID!: number;

    creationDate?: Date;
    activityType!: string;

    textbankContactDetails?: TextbankContactDetails;
    phonebankContactDetails?: PhonebankContactDetails;

    nonResponse?: NonResponse;
    surveyResponse?: SurveyResponse;

    pass!: number;
    complete!: boolean;
    member!: boolean;  
    activityHouseholdRecordID?: string;
}

export class TextbankContactDetails{
    residentPhonenumber!: string;
    userPhonenumber!: string;
    textSuccessful!: boolean;
    textReceived?: {status: string, date: Date};
    textConvo?: TextConversation[]
    initTextMessage?: string;
    imageUrl?: string;
}

export class PhonebankContactDetails{
    residentPhonenumber!: string;
    userPhonenumber!: string;
    lengthOfCall?: Number;
    status?: string;
    CallSid?: string;
    conference?: boolean;
    attemptID?: string;
}


export class TextConversation  {
   origin!: string;
   msg!: string;
   error?: string;
   date?: Date;
}

export class SurveyResponse{
    surveyID!: string;
    questionResponses!: QuestionResponse[]
}

export class QuestionResponse{
    question!: string;
    response!: string;
    questionType!: string;
}

export class NonResponse{
    nonResponseSetID!: string;
    nonResponseType!: string;
    nonResponse!: string;
}

export class TextRecordsUpdated{
    textbankHouseholdRecord!: ActivityHouseholdRecord;
    textContactRecord!: ActivityContactRecord;
}

export class ActivityHouseholdRecord {
    _id?: string;
    activityID!: string;
    complete!: boolean;
    passed!: boolean;
    household!: Household;
    date!: Date;
    timesContacted!: number;
    locked!: boolean;
    lockedBy!: string;
    dropped?: boolean;
    droppedBy?: string;
}

export class CanvassDialogData{
    activity!: Activity;
    survey!: Survey;
    nonResponseSet!: NonResponseSet
    building?: any
    canvassHouseholdRecord?: ActivityHouseholdRecord
    canvassBuildingRecord?: CanvassBuildingRecord
    showNearestPollingLocations: boolean;
    showPartisan: boolean;
}

export class CanvassBuildingRecord{
    complete!: boolean[];
    passed!: boolean[];
    records!: ActivityHouseholdRecord[]
    _id!: any;
}
