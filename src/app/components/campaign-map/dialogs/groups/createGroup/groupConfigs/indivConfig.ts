export const indivGeneralConfigTemplate = {
  age: {
    name: 'Age', 
    value: 'age', 
    options: [  {name: 'Youth(18-35)', value: 'youth'},  
                {name: 'Middle(36-66)', value: 'middle'},  
                {name: 'Retired(67 and Older)', value: 'retired'}],
    multiple: true
  },
  ethnicity: {
    name: 'Race',
    value: "ethnicity",
    options: [
          {name: 'Black', value: 'black'},
          {name: 'Hispanic', value: 'hispanic'},
          {name: 'API', value: 'api'},
          {name: 'Native', value: 'native'},
          {name: 'White', value: 'white'},
          {name: 'Multiple', value: 'multiple'},
          {name: 'Other', value: 'other'}
        ],
    multiple: true
  },
  gender: {
    name: 'Gender',
    value: "gender",
    options: [
          {name: 'Male', value: 'male'},
          {name: 'Female', value: 'female'},
          {name: 'Unkown', value: 'unknown'},
        ],
    multiple: true
  },
  renter: {
    name: 'Renter',
    value: 'renter', 
    options: [{name: 'Has Unit Number', value: true},
              {name: 'No Unit Number', value: false}]
  },
  party: {
    name: 'Party',
    value: "party",
    options: [
      {name: 'No Party Preference Only', value:'NPP'},
      {name: 'Democrat Only', value:'DEM'},
      {name: 'Republican Only', value:'REP'},
      {name: 'Liberal Minor Party Only', value:'MPL'},
      {name: 'Conservative Minor Party Only', value:'MPC'},
      {name: 'Other Only', value:'OTH'},
    ],
    multiple: true
  },
  exclude_party:{
    name: 'Exclude Party',
    value: "exclude_party",
    options: [
      {name: 'No Party Preference', value:'NPP'},
      {name: 'Democrat', value:'DEM'},
      {name: 'Republican', value:'REP'},
      {name: 'Liberal Minor Party', value:'MPL'},
      {name: 'Conservative Minor Party', value:'MPC'},
      {name: 'Other', value:'OTH'},
    ],
    multiple: true
  },
  exclude_race:{
    name: 'Exclude Race',
    value: "exclude_race",
    options: [
      {name: 'Black', value: 'black'},
      {name: 'Hispanic', value: 'hispanic'},
      {name: 'API', value: 'api'},
      {name: 'Native', value: 'native'},
      {name: 'White', value: 'white'},
      {name: 'Multiple', value: 'multiple'},
      {name: 'Other', value: 'other'},
    ],
    multiple: true
  },
  spanish_probable: {name: 'Spanish Probable', value: "spanish_probable", options: [{name: 'Yes', value: true}, {name: 'No', value: false}]},
  progressive: {name: 'Progressive', value: "progressive", options: [{name: 'Yes', value: true}, {name: 'No', value: false}]},
  segment: {name: 'Segment', 
            value: "segment", 
            options: [
              {name: 'Anti-Woke Traditionalists', value: 'Anti-Woke Traditionalists'},
              {name: 'Core MAGA', value: 'Core MAGA'},
              {name: 'Diverse Disaffected Conservatives', value: 'Diverse Disaffected Conservatives'},
              {name: 'Mainstream Liberals', value: 'Mainstream Liberals'},
              {name: 'Next Gen Left', value: 'Next Gen Left'},
              {name: 'Secure Suburbanites', value: 'Secure Suburbanites'},
              {name: 'Tuned Out Persuadables', value: 'Tuned Out Persuadables'},
              {name: 'West Coast Moderates', value: 'West Coast Moderates'}
            ],
    multiple: true


},
  //special_campaign: {name: 'Special Campaign', value: "special_campaign", options: [{name: '1', value: 1}, {name: '2', value: 2}, {name: '3', value: 3}], multiple: true},
  //likely_callable: {name: 'Likely Callable', value: "likely_callable", options: [{name: 'Yes', value: true}]},
  phones: {name: "Has Phones?", value: "phones", options: [{name: "Yes", value: true}, {name: "No", value: false}]},
  regDate: {name: 'Registration Date', value: 'regDate', date: true},
  pdiIDs: {name: 'PDI ID List (CSV)', value: 'pdiIDs', upload: true},
}

export const indivContactConfigTemplate = {

  date_contacted: {name: "Date Contacted", value: "date_contacted", date: true},
  and_surveys: {name: 'Surveys - $AND', value:"and_surveys", options: [], multiple: true},
  or_surveys: {name: 'Surveys - $OR', value:"or_surveys", options: [], multiple: true},
  not_surveys: {name: 'Surveys - $NOT', value:"not_surveys", options: [], multiple: true},
  text_sent: {name: "Text Sent?", value: "text_sent", options: [{name: "Yes", value: true}, {name: "No", value: false}]},
  not_nonResponseSets: {name: "Non-Response Sets - $NOT", value: "not_nonResponseSets", options: [], multiple: true },
  or_nonResponseSets: {name: "Non-Response Sets - $OR", value: "or_nonResponseSets", options: [], multiple: true },
  or_survey_contacts: {name: "Survey Contacts - $OR", value: "or_survey_contacts", options: [], multiple: true},
  and_survey_contacts: {name: "Survey Contacts - $AND", value: "and_survey_contacts", options: [], multiple: true},
  not_survey_contacts: {name: "Survey Contacts - $NOT", value: "not_survey_contacts", options: [], multiple: true},
  all_survey_contacts: {name: "All Survey Contacts", value: "all_survey_contacts", options: [{name: "Include", value: true}, {name: "Exclude", value: false}]},
  contacted_by: {name: "Contacted By Team Member", value: "contacted_by", options: [], multiple: true},
  recentContact: {name: "Recently Contacted", value:"recentContact", options: [{name: "In the Last 6 Hours", value: 6}, {name: "In the Last 12 Hours", value: 12}, {name: "In the Last 24 Hours", value: 24}, {name: "In the Last 72 Hours", value: 72}]},

}

export const indivGeoConfigTemplate = {
  polygons: {name: 'Polygons', value: "polygons", options:[]},
  zips: {name: "Zip Code", value: "zips", options: [], multiple: true},
  cities: {name: "City", value: "cities", options: [], multiple: true},
  precincts: {name: "Precincts", value: "precincts", options: [], multiple: true},
  districts: {name: "Districts", value: "districts", options: [], multiple: true},
}

export const memberConfigTemplate = {
  voter: {
    name: 'Voter',
    value: 'voter', 
    options: [{name: 'Is Voter', value: true},
              {name: 'Not A Voter', value: false}]
  },
  // Any stored value lifts the campaign-district limit (older groups stored false)
  ignoreDistrict: {
    name: 'Entire membership list',
    value: 'ignoreDistrict',
    options: [{name: 'Yes — include members outside the campaign district', value: true}]
  },
  // Older saved groups' tag-name filter; still read and converted, but new filters use the Tags rows below
  tags: {name: 'Tags', value: 'tags', options: [], multiple: true, hidden: true},
  // The Tags filter: rows of {label, values}. Members must have every tag; values optionally narrow a row
  tagValues: {name: 'Tags', value: 'tagValues', tagValues: true},
  optinTexting: {name: 'Texting consent', value: 'optinTexting', options: [{name: 'Has texting consent', value: true}]},
  optinEmail: {name: 'Email consent', value: 'optinEmail', options: [{name: 'Has email consent', value: true}]},
  uploads: {name: 'Uploads', value: 'uploads', options: [], multiple: true},
  activities: {name: 'Activities', value: 'activities', options: [], multiple: true},
}

const VOTE_HISTORY_ELECTIONS = [
  {name: "2026 Primary", value: "2026 Primary"},
  {name: "2025 Special", value: "2025 Special"},
  {name: "2024 General", value: "2024 General"},
  {name: "2024 Primary", value: "2024 Primary"},
  {name: "2022 General", value: "2022 General"},
  {name: "2022 Primary", value: "2022 Primary"},
  {name: "2021 Special", value: "2021 Special"},
  {name: "2020 General", value: "2020 General"},
  {name: "2020 Primary", value: "2020 Primary"}
]

export const indivVoteHistoryConfigTemplate = {
  generalPropensity: {
    name: 'General Propensity',
    value:"generalPropensity",  
    options: [
      {name: 'High (Greater than or Equal to 75%)', value: 'HIGH'},
      {name: 'Medium (Between 35% and 74%)', value: 'MEDIUM'},
      {name: 'Low (Between 1% and 34%)', value: 'LOW'},
      {name: 'None (0%)', value: 'NONE'}
    ],
    multiple: true
  },
  primaryPropensity: {
      name: 'Primary Propensity',  
      value:"primaryPropensity",
      options: [
        {name: 'High (Greater than or Equal to 75%)', value: 'HIGH'},
        {name: 'Medium (Between 35% and 74%)', value: 'MEDIUM'},
        {name: 'Low (Between 1% and 34%)', value: 'LOW'},
        {name: 'None (0%)', value: 'NONE'}
      ],
      multiple: true
  },
  specialPropensity: {
            name: 'Special Propensity', 
            value:"specialPropensity",
            options: [
              {name: 'High (Greater than or Equal to 75%)', value: 'HIGH'},
              {name: 'Medium (Between 35% and 74%)', value: 'MEDIUM'},
              {name: 'Low (Between 1% and 34%)', value: 'LOW'},
              {name: 'None (0%)', value: 'NONE'}
            ],
            multiple: true
  },
  overallPropensity: {
              name: 'Overall Propensity', 
              value:"overallPropensity",
              options: [
                {name: '5-6 Of the Last Six Elections', value: 'HIGH'},
                {name: '3-4 Of the Last Six Elections', value: 'MEDIUM'},
                {name: '1-2 Of the Last Six Elections', value: 'LOW'},
                {name: 'None', value: 'NONE'}
              ],
              multiple: true
  },
  voteHistory: {name: "Vote History", value: "voteHistory", options: VOTE_HISTORY_ELECTIONS, multiple: true},
  not_voteHistory: {name: "Did Not Vote In", value: "not_voteHistory", options: VOTE_HISTORY_ELECTIONS, multiple: true},
  exclude_voted_current_cycle: {name: "Exclude Voted Current Cycle", value: "exclude_voted_current_cycle", options: [{name: "Exclude", value: true}]},
}