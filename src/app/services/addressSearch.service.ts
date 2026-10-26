import { Injectable } from '@angular/core';
import { ClientConfigService } from './clientConfig.service';

export interface AddressSuggestion {
  text: string;
  prediction: any;   // google.maps.places.PlacePrediction
}

export interface PickedAddress {
  line: string;      // "3204 Rubidoux Blvd"
  streetNum: string;
  street: string;
  city: string;
  zip: string;
  state: string;     // short, e.g. "CA"
  county: string;    // without " County"
}

declare global {
  interface Window { __ampMapsReady?: () => void; gm_authFailure?: () => void; }
}

/**
 * Google address suggestions (Places API (New)). Loads the Maps script on first use.
 * A bad key, a blocked request or no network only turns suggestions off; typing still works.
 */
@Injectable({ providedIn: 'root' })
export class AddressSearchService {

  private loading: Promise<boolean> | null = null;
  private failed: boolean = false;
  private places: any = null;          // the 'places' library
  private sessionToken: any = null;

  constructor(private clientConfig: ClientConfigService) {}

  // The key comes from the server (clientConfig); until it's loaded, suggestions count as available
  get available(): boolean {
    return !this.failed
  }

  load(): Promise<boolean> {
    if(this.failed) return Promise.resolve(false)
    if(this.loading) return this.loading

    this.loading = this.clientConfig.load().then(config => config.googleMapsKey ? this.loadScript(config.googleMapsKey) : this.noKey())
    return this.loading
  }

  private noKey(): boolean {
    this.failed = true
    return false
  }

  private loadScript(key: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      // Google calls this when it rejects the key
      window.gm_authFailure = () => {
        this.failed = true
        console.warn('Address search is off: Google rejected the Maps API key.')
      }

      const finish = async() => {
        try {
          this.places = await (window as any).google.maps.importLibrary('places')
          resolve(!this.failed)
        } catch(e){
          this.failed = true
          resolve(false)
        }
      }

      if((window as any).google?.maps?.importLibrary){
        finish()
        return
      }

      window.__ampMapsReady = () => finish()
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__ampMapsReady`
      script.async = true
      script.onerror = () => { this.failed = true; resolve(false) }
      document.head.appendChild(script)
    })
  }

  async suggest(text: string): Promise<AddressSuggestion[]> {
    const input = (text || '').trim()
    if(input.length < 3 || !(await this.load()) || !this.places) return []

    try {
      // One token per search and pick, so Google treats them as one session
      if(!this.sessionToken) this.sessionToken = new this.places.AutocompleteSessionToken()
      const {suggestions} = await this.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: this.sessionToken,
        includedRegionCodes: ['us'],
      })
      return (suggestions || [])
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({text: s.placePrediction.text?.toString() || '', prediction: s.placePrediction}))
    } catch(e){
      // A rejected key won't start working mid-session; stop asking
      if(/api key|referer|not authorized|billing/i.test(String((e as any)?.message || e))) this.failed = true
      console.warn('Address suggestions failed', e)
      return []
    }
  }

  async resolve(suggestion: AddressSuggestion): Promise<PickedAddress | null> {
    try {
      const place = suggestion.prediction.toPlace()
      await place.fetchFields({fields: ['addressComponents', 'formattedAddress']})
      this.sessionToken = null

      const part = (type: string, short = false): string => {
        const component = (place.addressComponents || []).find((c: any) => (c.types || []).includes(type))
        return (short ? component?.shortText : component?.longText) || ''
      }

      const streetNum = part('street_number')
      const street = part('route', true) || part('route')
      const line = [streetNum, street].filter(Boolean).join(' ') || (place.formattedAddress || '').split(',')[0] || ''

      return {
        line,
        streetNum,
        street,
        city: part('locality') || part('sublocality') || part('postal_town'),
        zip: part('postal_code'),
        state: part('administrative_area_level_1', true),
        county: part('administrative_area_level_2').replace(/ County$/i, '').toUpperCase(),
      }
    } catch(e){
      console.warn('Address details failed', e)
      this.sessionToken = null
      return null
    }
  }
}
