import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import geofire from "npm:geofire-common@6.0.0";


const baseUrl = "https://fppdirectapi-prod.fuelpricesqld.com.au";
const resources = {
  brands: "Subscriber/GetCountryBrands?countryId=21",
  fuels: "Subscriber/GetCountryFuelTypes?countryId=21",
  sites:
    "Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=3&geoRegionId=1",
  sites_prices:
    "Price/GetSitesPrices?countryId=21&geoRegionLevel=3&geoRegionId=1",
};

export interface IBrand {
  Name: string
  BrandId: number
}

export interface IFuel {
  Name: string
  FuelId: number
}

export interface IRawSite {
  S: number // siteId
  A: string // address
  N: string // name
  B: number // brandId
  P: string // string
  Lat: number
  Lng: number
  M: string // date last modiefied
  GPI: string // GooglePlaceId
}

export interface ISitePrice {
  SiteId: number
  FuelId: number
  Price: number
  TransactionDateUtc: string
  CollectionMethod: string
}

export interface ISite {
  SiteId: number
  Address: string
  Name: string
  BrandId: number
  PostCode: string
  Lat: number
  Lng: number
  LastModified: Date
  GooglePlaceId: string
  Geohash: string
  Prices: {[FuelId: string]: ISitePrice}
}

interface IAllData {
  brands: Array<IBrand>,
  fuels: Array<IFuel>,
  sites: Array<ISite>,
}



export const getAllData = async (): Promise<IAllData> => {

  const brands = await _fetch<{Brands: Array<IBrand>}>(resources.brands);
  const fuels = await _fetch<{Fuels: Array<IFuel>}>(resources.fuels);
  const sites = await _fetch<{S: Array<IRawSite>}>(resources.sites);
  const sitePrices = await _fetch<{SitePrices: Array<ISitePrice>}>(resources.sites_prices);

  return {
    brands: brands.Brands,
    fuels: fuels.Fuels,
    sites: parseSites(sites.S, sitePrices.SitePrices)
  }

};

const _fetch = async <T>(resource: string): Promise<T> => {
  return await fetch(`${baseUrl}/${resource}`, {
    headers: {
      Authorization: `FPDAPI SubscriberToken=${Deno.env.get("API_TOKEN")}`,
    },
  })
    .then((result) => {
      return result.json();
    })
}

const parseSites = (rawData: IRawSite[], sitePrices: ISitePrice[]): ISite[] => {

  const sitesParsed = [] as ISite[];

  rawData.forEach((rawSite) => {
    const prices = {} as {[FuelId: string]: ISitePrice}
    sitePrices.filter(sp => sp.SiteId === rawSite.S).sort((a,b) =>
      (new Date(a.TransactionDateUtc)).getTime() < (new Date(b.TransactionDateUtc)).getTime() ? 1 : -1)
      .forEach((sp) => {
        if (!prices[sp.FuelId]) {
          prices[sp.FuelId] = sp;
        }
    })

    sitesParsed.push({
      SiteId: rawSite.S,
      Address: rawSite.A,
      Name: rawSite.N,
      BrandId: rawSite.B,
      PostCode: rawSite.P,
      Lat: rawSite.Lat,
      Lng: rawSite.Lng,
      LastModified: new Date(rawSite.M),
      GooglePlaceId: rawSite.GPI,
      Geohash: geofire.geohashForLocation([rawSite.Lat, rawSite.Lng]),
      Prices: prices
    });
  });



    return sitesParsed;

}
