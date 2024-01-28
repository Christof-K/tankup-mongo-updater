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


export const getAllData = (): Promise<{
  brands: Array<IBrand>,
  fuels: Array<IFuel>,
  sites: Array<ISite>,
}> => {
  return new Promise((resolve) => {

    const mergedData = {
      brands: [] as Array<IBrand>,
      fuels: [] as Array<IFuel>,
      sites: [] as Array<ISite>,
    };

    const promises = [] as Array<Promise<Response>>;
    Object.entries(resources).forEach(([resourceName, resource]) => {
      const promise = fetch(`${baseUrl}/${resource}`, {
        headers: {
          Authorization: `FPDAPI SubscriberToken=${Deno.env.get("API_TOKEN")}`,
        },
      })
        .then((result) => {
          return result.json();
        })
        .then((data) => {


          switch (resourceName) {
            case "brands": {
              mergedData.brands.push(...data.Brands as IBrand[]);
              break;
            }
            case "fuels": {
              mergedData.fuels.push(...data.Fuels as IFuel[]);
              break;
            }
            case "sites": {
              const sites = data.S as IRawSite[]
              const parsedSites = parseSites(sites, data.site_prices as ISitePrice[])
              mergedData.sites.push(...parsedSites as ISite[]);
              break;
            }
            // todo: history data site prices
          }
        });
      // @ts-ignore
      promises.push(promise as Promise<Response>)
    });

    Promise.all(promises).then(() => resolve(mergedData));
  });
};


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
