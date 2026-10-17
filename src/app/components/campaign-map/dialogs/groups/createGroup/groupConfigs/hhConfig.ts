export const hhConfigTemplate = {
    age: {name: 'Age', value: 'age', options: [
        {name: 'Youth(18-35)', value: 'youth'},
        {name: 'Middle(36-66)', value: 'middle'},
        {name: 'Retired(67 and Older)', value: 'retired'},
      ], multiple: true},
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
        ], multiple: true
      },
  gender: {
        name: 'Gender',
        value: "gender",
        options: [
          {name: 'Male', value: 'male'},
          {name: 'Female', value: 'female'},
          {name: 'Unkown', value: 'unknown'},
        ], multiple: true
      },
  renter: {name: 'Renter', 
               value: 'renter', 
               options: [{name: 'Has Unit Number', value: true},
                         {name: 'No Unit Number', value: false}]},
  single_party_household: {
        name: 'Single Party Household',
        value: "single_party_household",
        options: [
          {name: 'No Party Preference Only', value:'NPP'},
          {name: 'Democrat Only', value:'DEM'},
          {name: 'Republican Only', value:'REP'},
          {name: 'Liberal Minor Party Only', value:'MPL'},
          {name: 'Conservative Minor Party Only', value:'MPC'},
          {name: 'Other Only', value:'OTH'},
        ]
  },
  mixed_party_household: {
    name: 'Mixed Party Household',
        value: "mixed_party_household",
        options: [
          {name: '1+ No Party Preference', value:'1+_NPP'},
          {name: '1+ Democrat', value:'1+_DEM'},
          {name: '1+ Republican', value:'1+_REP'},
          {name: '1+ Liberal Minor Party', value:'1+_MPL'},
          {name: '1+ Conservative Minor Party', value:'1+_MPC'},
          {name: '1+ Other', value:'1+_OTH'},
        ]
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
    ]
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
    ]
  },
    spanish_probable: {name: 'Spanish Probable', value: "spanish_probable", options: [{name: 'Yes', value: true}, {name: 'No', value: false}]},
  special_campaign: {name: 'Special Campaign', value: "special_campaign", options: [{name: '1', value: 1}, {name: '2', value: 2}, {name: '3', value: 3}], multiple: true},
  //likely_callable: {name: 'Likely Callable', value: "likely_callable", options: [{name: 'Yes', value: true}]},
  phones: {name: "Has Phones?", value: "phones", options: [{name: "Yes", value: true}, {name: "No", value: false}]},
  regDate: {name: 'Registration Date', value: 'regDate', date: true},
  pdiIDs: {name: 'PDI ID List (CSV)', value: 'pdiIDs', upload: true},
}