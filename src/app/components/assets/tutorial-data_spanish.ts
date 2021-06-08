export const defaultStepOptions = {
    classes: 'shepherd-theme-arrows custom-default-class',
    scrollTo: true,
    cancelIcon: {
        enabled: true
    }
};

export const createCOI_spanish = [
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
        text: ['Aga clic al Boton para Editar el COI.'],
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
        title: 'Editar el COI!',
        text: ['Arrastre el puntero en las esquinas del rectángulo COI para remodelarlo.'],
        classes: 'modalOverlayOpeningPadding100',
        modalOverlayOpeningPadding: 100,
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
    },
    {
        title: 'Editar el COI!',
        text: ['El COI ahora ha sido remodelado. Presione el botón "Next" si desea editar la información de COI'],
        buttons: [{
            text: 'Next',
            type: 'next'
        }]
    },
    {
        title: 'Editar el COI!',
        text: ['Aga clic al Boton para Editar el COI.'],
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
        title: 'Editar el COI!',
        text: ['Haga clic en el COI para editar la información del COI.'],
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
        text: ['¡Tu COI ahora ha sido editado!'],
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
        title: 'Borar COI!',
        text: ['Comience haciendo clic primero en el botón "Habilitar modo de edición".'],
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
        title: 'Borar COI!',
        text: ['Haga clic en el COI que desea eliminar.'],
        attachTo: {
            element: '.tutorialPoly',
            on: 'auto'
        },
        modalOverlayOpeningPadding: 50,
    },
    {
        title: 'Borar COI!',
        text: ['Haga clic en el botón "Eliminar" y confirme su eliminación.'],
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
        title: 'Feicidades!',
        text: ['¡Tu COI ahora ha sido eliminado!'],
        buttons: [{
            classes: 'shepherd-button-primary',
            text: 'Done',
            type: 'cancel'
        }]
    }
];
