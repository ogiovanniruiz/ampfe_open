export const hhConfigTemplate = {
    fields: {
      age: {name: 'Age', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      ethnicity: {
        name: 'Ethnicity',
        type: 'category',
        operators: ['='],
        options: [
          {name: 'Black', value: 'black'},
          {name: 'Hispanic', value: 'hispanic'},
          {name: 'Asian', value: 'asian'},
          {name: 'White', value: 'white'},
          {name: 'Other', value: 'other'}
        ]
      },
      renter: {name: 'Renter', type: 'boolean'},
      party: {
        name: 'Party',
        type: 'category',
        operators: ['='],
        options: [
          {name: 'No Party Preference Only', value:'NPP'},
          {name: 'Democrat Only', value:'DEM'},
          {name: 'Republican Only', value:'REP'},
          {name: 'Liberal Minor Party Only', value:'MPL'},
          {name: 'Conservitive Minor Party Only', value:'MPC'},
          {name: 'Mixed', value:'MIXED'},
          {name: 'Other', value:'OTH'},
        ]
      },
      orgRegDate: {name: 'Org Reg Date', type: 'date'},
      generalPropensity: {name: 'General Propensity', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      primaryPropensity: {name: 'Primary Propensity', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      scripts: {name: 'Scripts', type: 'category', operators: ['in', 'not in'], options: []},
      nonResponseSets: {name: 'NonResponse Sets', type: 'category', operators: ['in', 'not in'], options: []},
      //blockgroups: {name: 'Blockgroups', type: 'category', operators: ['in'], options:[]},
      //precincts: {name: 'Precincts', type: 'category', operators: ['in'], options:[]},
      polygons: {name: 'Polygons', type: 'category', operators: ['in'], options:[]},
      cities: {name: 'Cities', type: 'category', operators: ['in'], options:[]}
    }
  }


  export const indivConfigTemplate = {
    fields: {
      age: {name: 'Age', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      ethnicity: {
        name: 'Ethnicity',
        type: 'category',
        operators: ['='],
        options: [
          {name: 'Black', value: 'black'},
          {name: 'Hispanic', value: 'hispanic'},
          {name: 'Asian', value: 'asian'},
          {name: 'White', value: 'white'},
          {name: 'Other', value: 'other'}
        ]
      },
      renter: {name: 'Renter', type: 'boolean'},
      party: {
        name: 'Party',
        type: 'category',
        operators: ['='],
        options: [
          {name: 'No Party Preference Only', value:'NPP'},
          {name: 'Democrat Only', value:'DEM'},
          {name: 'Republican Only', value:'REP'},
          {name: 'Liberal Minor Party Only', value:'MPL'},
          {name: 'Conservitive Minor Party Only', value:'MPC'},
          {name: 'Other', value:'OTH'},
        ]
      },
      orgRegDate: {name: 'Org Reg Date', type: 'date'},
      generalPropensity: {name: 'General Propensity', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      primaryPropensity: {name: 'Primary Propensity', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      scripts: {name: 'Scripts', type: 'category', operators: ['in', 'not in'], options: []},
      nonResponseSets: {name: 'NonResponse Sets', type: 'category', operators: ['in', 'not in'], options: []},
      //blockgroups: {name: 'Blockgroups', type: 'category', operators: ['in'], options:[]},
      //precincts: {name: 'Precincts', type: 'category', operators: ['in'], options:[]},
      polygons: {name: 'Polygons', type: 'category', operators: ['in'], options:[]},
      cities: {name: 'Cities', type: 'category', operators: ['in'], options:[]}
    }
  }

  export const memberConfigTemplate = {
    fields: {
      age: {name: 'Age', type: 'number', operators: ['=', '<=', '<', '>=', '>']},
      ethnicity: {
        name: 'Ethnicity',
        type: 'category',
        operators: ['='],
        options: [
          {name: 'Black', value: 'black'},
          {name: 'Hispanic', value: 'hispanic'},
          {name: 'Latino', value: 'latino'},
          {name: 'Asian', value: 'asian'},
          {name: 'White', value: 'white'},
          {name: 'Other', value: 'other'}
        ]
      },
      voter: {name: 'Voter', type: 'boolean'},
      scripts: {name: 'Scripts', type: 'category', operators: ['in', 'not in'], options: []},
      nonResponseSets: {name: 'NonResponse Sets', type: 'category', operators: ['in', 'not in'], options: []},
      //blockgroups: {name: 'Blockgroups', type: 'category', operators: ['in'], options:[]},
      //precincts: {name: 'Precincts', type: 'category', operators: ['in'], options:[]},
      polygons: {name: 'Polygons', type: 'category', operators: ['in'], options:[]},
      cities: {name: 'Cities', type: 'category', operators: ['in'], options:[]},
      tags: {name: 'Tags', type: 'category', operators: ['in'], options: []},
      uploads: {name: 'Uploads', type: 'category', operators: ['in'], options: []}
    }
  }
