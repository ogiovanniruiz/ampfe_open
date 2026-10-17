export class Campaign {
    campaignID!: number;
    name!: string;
    orgIDs!: string[];
    description!: string;
    active!: boolean;
    requests!: string[];
    boundaryIDs!: string[];
    creatorOrg!: string;
    electionType!: string;
    electionYear!: string;
    fundedByCreatorOrg!: boolean;
    textingFundedByCreatorOrg!: boolean;
    geographical!: boolean;
    sleep!: boolean;
    allOrgPolygons!: boolean;
    showNearestPollingLocations!: boolean;
    showPartisan!: boolean;
    defaultCampaignWideGroupID!: string;
}

export class UpdatedCampaign {
    success!: boolean;
    campaign!: Campaign;
    msg!: string;
}
