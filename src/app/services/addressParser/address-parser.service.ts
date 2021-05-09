import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class AddressParserService {

  constructor() { }

  parseAddress(address: String){

  
    var prefices = ["E", "N", "W", "S", "NW", "NE"]
    var suffices = ["AVE","BLVD","BRG","CIR","CRK","CRST","CT","CTR","CV","CYN","DR","EXPY","FLDS","FLTS","HL","HLS","HTS","HWY","IS","LN","LOOP","LP","MDW","ML","PARK","PASS","PATH","PK","PKWY","PL","PLZ","PT","RD","RDG","RUN","SQ","ST","TER","TRL","VIS","VLY","VW","WALK","WAY","XING","AVENUE","BOULEVARD","BRIDGE","CIRCLE","CREEK","CREST","COURT","CENTER","COVE","CANYON","DRIVE","EXPRESSWAY","FIELDS","FLATS","HILL","HILLS","HEIGHTS","HIGHWAY","ISLAND","LANE","MEADOW","MILL","PARKS","PARK","PARKWAY","PLACE","PLAZA","POINT","ROAD","RIDGE","SQUARE","STREET","TERRACE","TRAIL","VISTA","VIEW"]
    var units = ["APARTMENT","BLDG","FLOOR","SUITE","UNIT","ROOM","DEPARTMENT","RM","DEPT","FL","STE","APT","#"]
    

    var brokenAddress = address.split(" ")
    for (let i = 0; i < brokenAddress.length; i++) {
        if (typeof brokenAddress[i] === 'string') {
            brokenAddress[i] = brokenAddress[i].toUpperCase();
        }
    }

    const streetNum = brokenAddress[0]
    var prefix = ""
    var street = ""
    var suffix = ""
    var unit = ""

    var p

    if (prefices.includes(brokenAddress[1])) {
        prefix = brokenAddress[1]
        p = 1
    }
    else {
        p = 0
    }

    for (var s = brokenAddress.length - 1; s > 0; s = s - 1) {
      if (suffices.includes(brokenAddress[s])) {
          break
      }
      else {s = -1}
  }

  for (var u = brokenAddress.length - 1; u > 0; u = u - 1) {
      if (units.includes(brokenAddress[u])) {
          return u
      }
      else {
          u = -1
          unit = ""
      }
  }

  var u1 = brokenAddress.findIndex(element => element.includes("#"))
  var u2 = brokenAddress.findIndex(element => element.includes("APT"))

  if (p == 1 && s != -1) {
      var street1 = brokenAddress.slice(2, s)
      street = street1.join()
      suffix = brokenAddress[s]

      if (u != -1) {
          var unit1 = brokenAddress.slice(s+1, brokenAddress.length)
          unit = unit1.join()
      }
  }

  else if (p == 0 && s != -1) {
      var street2 = brokenAddress.slice(1, s)
      street = street2.join()
      suffix = brokenAddress[s]

      if (u != -1) {
          var unit2 = brokenAddress.slice(s+1, brokenAddress.length)
          unit = unit2.join()
      }
  }

  else if (p == 1 && s == -1) {
      if (u != -1) {
          var unit3 = brokenAddress.slice(u, brokenAddress.length)
          unit = unit3.join()
          var street3 = brokenAddress.slice(2, u)
          street = street3.join()
      }
      else if (u == -1 && u1 == -1 && u2 == -1) {
          var street4 = brokenAddress.slice(2, brokenAddress.length)
          street = street4.join()
      }
      else if (u == -1 && u1 != -1) {
          var unit31 = brokenAddress.slice(u1, brokenAddress.length)
          unit = unit31.join()
          var street41 = brokenAddress.slice(2, u1)
          street = street41.join()
      }
      else if (u == -1 && u2 != -1) {
          var unit32 = brokenAddress.slice(u2, brokenAddress.length)
          unit = unit32.join()
          var street42 = brokenAddress.slice(2, u2)
          street = street42.join()
      }
  }

  else if (p == 0 && s == -1) {
      if (u != -1) {
          var unit4 = brokenAddress.slice(u, brokenAddress.length)
          unit = unit4.join()
          var street5 = brokenAddress.slice(1, u)
          street = street5.join()
      }
      else if (u == -1) {
          var street6 = brokenAddress.slice(1, brokenAddress.length)
          street = street6.join()
      }
      else if (u == -1 && u1 != -1) {
          var unit41 = brokenAddress.slice(u1, brokenAddress.length)
          unit = unit41.join()
          var street61 = brokenAddress.slice(1, u1)
          street = street61.join()
      }
      else if (u == -1 && u2 != -1) {
          var unit42 = brokenAddress.slice(u2, brokenAddress.length)
          unit = unit42.join()
          var street62 = brokenAddress.slice(1, u2)
          street = street62.join()
      }
  }

    var addressObj= {streetNum: streetNum, 
                     prefix: prefix,
                    street: street,
                suffix: suffix,
              unit: unit}

    return addressObj

  }
}
