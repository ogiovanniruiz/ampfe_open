import { Component, OnInit, HostListener, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import {Router, ActivatedRoute, Params } from "@angular/router";
import { Location } from '@angular/common'
import { OAuthService } from 'angular-oauth2-oidc';
import { JwksValidationHandler } from 'angular-oauth2-oidc-jwks';
import { authConfig } from './auth.config';
import {MatDialog} from '@angular/material/dialog';
import {ContactFormDialog} from './dialogs/contactForm/contactForm';
import { LoginDialog, loginDialogConfig } from './dialogs/loginDialog/loginDialog';
import * as L from 'leaflet';
import { MapDialog } from './dialogs/mapDialog/mapDialog';
import { AmplifyService } from './services/amplify.service';
import { UserProfileDialog } from './dialogs/userProfile/userProfile';
import { AuthGuard } from './authguards/auth-guard.service';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class AppComponent implements OnInit{

  constructor(private oauthService: OAuthService, 
              public router: Router, 
              public dialog: MatDialog,
              private route: ActivatedRoute,
              private location: Location,
              private ampService: AmplifyService,
              private authGuard: AuthGuard,
              private appUpdate: AppUpdateService,
              ) {
                
    this.configureWithNewConfigApi();
    // Offer a reload when a new version has been deployed
    this.appUpdate.start();

    if(this.location.path() === '/' || this.location.path() === '' ){
      this.openLoginDialog()
    }
  }

  displayMessage: boolean = false;
  userMessage: string;

  checkFlag: boolean = false;

  errorMessage: string = '';
  displayErrorMessage: boolean = false;

  screenSize: string;

  leafletMap: L.Map;

  fillOpacitiy = 0.1

  layersControl = {overlays: {}, options: {collapsed: false}};

  loadingMap: boolean = false;

  center;

  registrationLayerLoaded = false;
  election2020LayerLoaded = false;
  election2022LayerLoaded = false;

  private configureWithNewConfigApi() {
    this.oauthService.configure(authConfig);
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  options = {
    layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  drawOptions = {
    position: 'topright',
    draw: {
      marker: false,
      polygon: {allowIntersection: false,
                shapeOptions: {
                color: 'red'
                }},
      polyline: false,
      circle: false,
      rectangle: false,
      circlemarker: false
    },
  };

  openContactDialog(): void {
    // Full width on phones; a comfortable fixed width for the message box on desktop
    const isMobile = window.innerWidth < 768;
    this.dialog.open(ContactFormDialog, isMobile
      ? {autoFocus: false, width: '100vw', maxWidth: '100vw'}
      : {autoFocus: false, width: '560px', maxWidth: '95vw'});
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params: Params) => {
      if(params.dir){
        sessionStorage.setItem('rdr', params.dir)

        setTimeout(()=>{
          this.openLoginDialog()
        })
      }
    });

  }

  goToHome(){
    sessionStorage.removeItem('rdr')
    this.router.navigate(['/home']);
  }

  goBack(){
    sessionStorage.removeItem('rdr')
    this.location.back()
  }

  logOff(){
      this.checkFlag = false;
      this.authGuard.logOut();
  }

  ngAfterContentInit() {
    if (window.innerWidth >= 1200) {
      this.screenSize = "50%"; // lg
    } else if (window.innerWidth >= 992) {

      this.screenSize = "75%";//md
    } else if (window.innerWidth  >= 768) {
      this.screenSize = "75%";//sm

    } else if (window.innerWidth < 768) {
      this.screenSize = "100%";//xs
    }
  }

  @HostListener("window:resize", []) updateDays() {  
    if (window.innerWidth >= 1200) {
      this.screenSize = "50%"; // lg
    } else if (window.innerWidth >= 992) {
      this.screenSize = "70%";//md
    } else if (window.innerWidth  >= 768) {
      this.screenSize = "75%";//sm
    } else if (window.innerWidth < 768) {
      this.screenSize = "100%";//xs
    }
  }

  openLoginDialog(){
    const dialogRef = this.dialog.open(LoginDialog, loginDialogConfig());

    dialogRef.afterClosed().subscribe(command => {
      if(command === "open-map-dialog"){
        //this.getDistrictsById()
       //this.openMapDialog()
      }
    });
  }

  //openMapDialog(){
  //  const mapDialogRef = this.dialog.open(MapDialog, {autoFocus: false, disableClose: true, maxWidth:"100%"});
  //  mapDialogRef.afterClosed().subscribe((districtIdentifiders: string[]) => {
  //    //this.getDistrictsById()
  //  })
  //}

  onMapReady(map: L.Map){
    this.leafletMap = map;

    this.layersControl.overlays['Congressional'] = L.featureGroup();
    this.layersControl.overlays['Election Precincts 2022'] = L.featureGroup();
    this.layersControl.overlays['Election Precincts 2020'] = L.featureGroup();
    this.layersControl.overlays['Registration Precincts'] = L.featureGroup();

  }

  onDrawReady(drawControl: any) {
    this.leafletMap = drawControl.options.edit;
  }

  openUserProfileDialog(){
    this.dialog.open(UserProfileDialog, {autoFocus: false, disableClose: true, width: '520px', maxWidth: '94vw'});
  }

  getDistrictsById(){

    this.clearMap()

    this.loadingMap = true

    var districtIdentifider = ['CA_CONGRESSIONAL_41']

    this.ampService.getDistrictsByID(districtIdentifider).subscribe((districts: any[]) =>{

      let congressionalDistricts = districts.filter(district => district.properties.districtType === 'CONGRESSIONAL');

      let congressionallayer = L.geoJSON(congressionalDistricts, {onEachFeature: onEachFeature.bind(this)}).addTo(this.leafletMap)


      function onEachFeature(feature: any, layer: any){

        var layerName: string = "District: " + feature.properties.districtType + ' ' + feature.properties.name + '<br>' + //feature.properties.demographics.totalPop;
                                "Representative: "+ feature.properties.electionData.representative + "<br>" +
                                "Elected Year: " + feature.properties.electionData.elected + "<br>"  +
                                "Next Election: " + feature.properties.electionData.nextElection + "<br>"

        if(feature.properties.districtType === 'CONGRESSIONAL') {
          layer.addTo(this.layersControl.overlays['Congressional']);
          layer.bindTooltip(layerName).setStyle({fillColor: 'black', color: 'black', opacity: 1, fillOpacity: this.fillOpacitiy});
        }

      }

      var center = congressionallayer.getBounds().getCenter();
      setTimeout(() => {
          this.center = [center.lat, center.lng];
          this.leafletMap.fitBounds(congressionallayer.getBounds());
      });

      this.layersControl.overlays['Congressional'] = congressionallayer;

      this.loadingMap = false
    })
  }

  loadElectionPrecincts(county: string, year: string){

    if(year === '2020' && this.election2020LayerLoaded === true) return
    if(year === '2022' && this.election2022LayerLoaded === true) return

    this.loadingMap = true
    this.ampService.getElectionPrecincts(county, year).subscribe((results: any[]) =>{
      
      let layerPrecinct = L.geoJSON(results, {onEachFeature: onEachFeature.bind(this)});
      layerPrecinct.addTo(this.leafletMap)
      
      function onEachFeature(feature, layerPrec) {

        if(year === '2022'){
          var election = "Gov"
          var votedRed = feature["properties"]['electionData'].voteGovRep
          var votedBlue = feature["properties"]['electionData'].voteGovDem

        }else if(year === '2020'){
          var election = "Pres"
          var votedRed = feature["properties"]['electionData'].votePrsRep
          var votedBlue = feature["properties"]['electionData'].votePrsDem

        }

        var votedRedCNG = feature["properties"]['electionData'].voteCNGRep
        var votedBlueCNG = feature["properties"]['electionData'].voteCNGDem
        
        var percentRed: number = (votedRed /(votedBlue + votedRed))*100.00
        var percentBlue: number = (votedBlue /(votedBlue + votedRed))*100.00

        var percentRedCNG: number = (votedRedCNG /(votedBlueCNG + votedRedCNG))*100.00
        var percentBlueCNG: number = (votedBlueCNG /(votedBlueCNG + votedRedCNG))*100.00

        var color = "#00000"

        if(!Number.isNaN(percentRed)){
          color = this.getElectionGradientColor(percentRed)
        }
        
        layerPrec.setStyle({fillColor: color, color: 'black', opacity: 1, fillOpacity: 0.5, weight: 1});
        var toolTip: string = "<b>" + year + " " + "Electoral Data</b><br><br>" + 
                              "Precinct ID: " + feature["properties"]['precinctID'] + "<br>" +
                              "Number of Votes: " + feature["properties"]['electionData'].totalVote + "<br>" +
                              "% Voted Rep " + election + ": " + Math.round(percentRed) + "%<br>" +
                              "% Voted Dem " + election + ": " + Math.round(percentBlue) + "%<br><br>" +
                              "% Voted Dem CNG: " + Math.round(percentBlueCNG) + "%<br>" +
                              "% Voted Rep CNG: " + Math.round(percentRedCNG) + "%<br>"
                     
        layerPrec.bindTooltip(toolTip)//.on('dblclick', this.removePrecinct, this)
      }

      if(year === '2020') this.election2020LayerLoaded = true;
      if(year === '2022') this.election2022LayerLoaded = true;
      

      this.layersControl.overlays['Election Precincts ' + year] = layerPrecinct;
      this.loadingMap = false
    })
  }


  loadRegistrationPrecincts(county: string){

    if( this.registrationLayerLoaded === true) return


    this.loadingMap = true
    this.ampService.getRegistrationPrecincts(county).subscribe((results: any[]) =>{

      let layerRegPrecinct = L.geoJSON(results, {onEachFeature: onEachFeature.bind(this)});
      layerRegPrecinct.addTo(this.leafletMap)

      function onEachFeature(feature, layerPrec) {

        var percentDCL: number = (feature["properties"]['registrationData'].dcl /(feature["properties"]['registrationData'].totalReg))*100.00
        var percentDem: number = (feature["properties"]['registrationData'].dem /(feature["properties"]['registrationData'].totalReg))*100.00
        var percentRep: number = (feature["properties"]['registrationData'].rep /(feature["properties"]['registrationData'].totalReg))*100.00

        var color = "#00000"
        var normalized_opacity = feature["properties"]['registrationData'].totalHH/2000

        color = this.getRegistrationGradientColor(percentDem, percentRep, percentDCL)
        
        layerPrec.setStyle({fillColor: color, color: 'black', opacity: 1, fillOpacity: normalized_opacity, weight: 1});
        var toolTip: string = "<b>Registration Data</b><br><br>" + 
                                "Precinct ID: " + feature["properties"]['precinctID'] + "<br>" +
                                "Total Registered: " + feature["properties"]['registrationData'].totalReg + "<br>" +
                                "% Dems: " + Math.round(percentDem) + "%<br>" +
                                "% Reps: " + Math.round(percentRep) + "%<br>" +
                                "% DTS/NPP: " + Math.round(percentDCL) + "%<br><br>" +
                                "<i>Source: 2024 Voterfile</i><br>" 

        layerPrec.bindTooltip(toolTip)

      }

      this.layersControl.overlays['Registration Precincts'] = layerRegPrecinct;
      this.loadingMap = false

      this.registrationLayerLoaded = true

    })

  }

  clearMap(){
    this.leafletMap.eachLayer((layer: any) =>{
      if(layer._url != "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"){
        this.leafletMap.removeLayer(layer);
      }
    });
  }

  removePrecinct(feature){
    this.ampService.removePrecinct(feature.sourceTarget.feature.properties.precinctID).subscribe(result =>{
      console.log(result)
    })
  }

  blueRedGradient = {
    0: "#0000FF", // Blue
    1: "#008080", 
    2: "#800080", // Purple 
    3: "#FF0000", //  Red
    4: "#000000", // Black
  }

  blueRedRegGradient = {
    0: "#0000FF", // Blue
    2: "#FFFF00", // Purple 
    3: "#FF0000", //  Red
    4: "#000000", // Black
  }


  getRegistrationGradientColor(percentDem, percentRep, percentDCL){

    var arr = [percentDem, percentRep, percentDCL]

    var pos = arr.indexOf(Math.max(...arr))

    if(pos === 0){
      return this.blueRedRegGradient[0];
    }
    if(pos === 1){
      return this.blueRedRegGradient[3];
    }
    if(pos ===2){
      return this.blueRedRegGradient[2];
    }
  }

  getElectionGradientColor(percentile){

    if (percentile >= 0 && percentile < 45) {
      return this.blueRedGradient[0];
    }else if (percentile >= 45 && percentile < 50) {
      return this.blueRedGradient[1];
    }else if (percentile >= 50 && percentile < 55) {
      return this.blueRedGradient[2];
    }else if (percentile >= 55 && percentile <= 100) {
      return this.blueRedGradient[3];
    } else {
      return this.blueRedGradient[4]
    }
  }

}