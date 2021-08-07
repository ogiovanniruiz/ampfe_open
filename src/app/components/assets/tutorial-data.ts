export const defaultStepOptions = {
    classes: 'shepherd-theme-arrows custom-default-class',
    scrollTo: true,
    cancelIcon: {
        enabled: true
    }
};

export const createCOI = [
    {
        title: 'Create COI!',
        text: ['Start by first clicking the create COI tool button.'],
        attachTo: {
            element: '.leaflet-pm-toolbar',
            on: 'right'
        },
        advanceOn: {selector: '.leaflet-pm-toolbar', event: 'click'},
    },
    {
        id: 'alignTop',
        title: 'Create COI!',
        text: ['Next, click on the map to places the first vertex.'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Create COI!',
        text: ['Click on the COI you just drew to create it.'],
        attachTo: {
            element: '.regTutorial',
            on: 'auto'
        },
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    },
    {
        id: 'displayNone',
        title: 'Create COI!',
        text: ['Creating COI.........'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Congratulations!',
        text: ["You've created a COi."],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Done',
            type: 'cancel'
        }],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    }
];

export const cloneCOI = [
    {
        title: 'Clone COI!',
        text: ['Start by first clicking the "Enable Edit Geometry Mode" button.'],
        attachTo: {
            element: '.edit-coi-enable',
            on: 'right'
        },
        showOn(){
            if(document.getElementsByClassName('edit-coi-enable').length){
                return true;
            }
        },
        advanceOn: {selector: '.edit-coi-enable', event: 'click'},
    },
    {
        title: 'Clone COI!',
        text: ['Click the COI to clone it.'],
        classes: 'modalOverlayOpeningPadding100',
        modalOverlayOpeningPadding: 50,
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    },
    {
        id: 'displayNone',
        title: 'Clone COI!',
        text: ['Clone COI.........'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Congratulations!',
        text: ["You've cloned a COI. You can edit and reshape the cloned COI after it has been cloned."],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Done',
            type: 'cancel'
        }],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    }
];

export const editCOI = [
    {
        title: 'Edit COI!',
        text: ['Start by first clicking the "Enable Edit Mode" button.'],
        attachTo: {
            element: '.edit-geometry-enable',
            on: 'right'
        },
        showOn(){
            if(document.getElementsByClassName('edit-geometry-enable').length){
                return true;
            }
        },
        advanceOn: {selector: '.edit-geometry-enable', event: 'click'},
    },
    {
        title: 'Edit COI!',
        text: ['Drag the pointer on the corners of the COI rectangle to reshape it.'],
        classes: 'modalOverlayOpeningPadding100',
        modalOverlayOpeningPadding: 100,
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
    },
    {
        title: 'Edit COI!',
        text: ['The COI has now been reshaped. Press the "Next" button if you want to edit the COI information'],
        buttons: [{
            text: 'Next',
            type: 'next'
        }]
    },
    {
        title: 'Edit COI!',
        text: ['Start by first clicking the "Enable Edit Mode" button.'],
        attachTo: {
            element: '.edit-coi-enable',
            on: 'right'
        },
        showOn(){
            if(document.getElementsByClassName('edit-coi-enable').length){
                return true;
            }
        },
        advanceOn: {selector: '.edit-coi-enable', event: 'click'},
    },
    {
        title: 'Edit COI!',
        text: ['Click the COI to edit the COI information.'],
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
    },
    {
        id: 'displayNone',
        title: 'COI!',
        text: ['COI.........'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        },
        showOn(){
            if(document.getElementsByClassName('edit-delete-button').length){
                return true;
            }
        }
    },
    {
        title: 'Congratulations!',
        text: ['Your COI has now been edited!'],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Done',
            type: 'cancel'
        }],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    }
];

export const deleteCOI = [
    {
        title: 'Delete COI!',
        text: ['Start by first clicking the "Enable Edit Mode" button.'],
        attachTo: {
            element: '.edit-coi-enable',
            on: 'right'
        },
        showOn(){
            if(document.getElementsByClassName('edit-coi-enable').length){
                return true;
            }
        },
        advanceOn: {selector: '.edit-coi-enable', event: 'click'},
    },
    {
        title: 'Delete COI!',
        text: ['Click on the COI you want to delete.'],
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
        modalOverlayOpeningPadding: 50,
    },
    {
        title: 'Delete COI!',
        text: ['Click the "Delete" button and confirm your deletion.'],
        cancelIcon: {
            enabled: false
        },
        attachTo: {
            element: '.edit-delete-button',
            on: 'right'
        },
        showOn(){
            if(document.getElementsByClassName('edit-delete-button').length){
                return true;
            }
        }
    },
    {
        title: 'Congratulations!',
        text: ['Your COI has now been deleted!'],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Done',
            type: 'cancel'
        }]
    }
];
