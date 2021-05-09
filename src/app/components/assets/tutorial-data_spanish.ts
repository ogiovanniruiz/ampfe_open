export const defaultStepOptions = {
    classes: 'shepherd-theme-arrows custom-default-class',
    scrollTo: true,
    cancelIcon: {
        enabled: true
    }
};

export const createCOI_spansh = [
    {
        title: 'Crear Comunidad De Interes!',
        text: ['Comience con haciendo clic el botón para Crear Comunidad De Interes'],
        attachTo: {
            element: '.leaflet-pm-toolbar',
            on: 'right'
        },
        advanceOn: {selector: '.leaflet-pm-toolbar', event: 'click'},
    },
    {
        id: 'alignTop',
        title: 'Crear Comunidad De Interes!',
        text: ['A continuación, haga clic en el mapa para colocar el primer vértice.'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Crear Comunidad De Interes!',
        text: ['Haga clic en el Comunidad De Interes que acaba de dibujar para crearlo.'],
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
        title: 'Crear Comunidad De Interes!',
        text: ['Crando un Comunidad De Interes.........'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Felicidades!',
        text: ["As Creado Un Comunidad De Interes!"],
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

export const cloneCOI_spanish = [
    {
        title: 'Clonar Comunidad De Interes!',
        text: ['Comienze con el boton del Lasso.'],
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
        title: 'Clonar Comunidad De Interes!',
        text: ['Aga clic al COI para empezar a clonar.'],
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
        title: 'Clonar Comunidad De Interes!',
        text: ['Clonar Comunidad De Interes.........'],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '0px';
            }
        }
    },
    {
        title: 'Felizdades',
        text: ["As clonado el COI."],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Terminar',
            type: 'cancel'
        }],
        when: {
            show: () => {
                document.getElementsByClassName('shepherd-modal-overlay-container')[0]['style'].height = '100vh';
            }
        }
    }
];

export const editCOI_spanish = [
    {
        title: 'Editar el COI!',
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
        title: 'Felizidades!',
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

export const deleteCOI_spanish = [
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
