import {
  MongoClient,
} from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { IBrand, IFuel, ISite, getAllData } from './qldFuelApiClient.ts';

const client = new MongoClient();
const db_url = `mongodb://${Deno.env.get("MONGO_USER")}:${Deno.env.get("MONGO_PASSWORD")}@${Deno.env.get("MONGO_HOST")}:${Deno.env.get("MONGO_PORT")}/${Deno.env.get("MONGO_DB")}`;
await client.connect(db_url);
const db = client.database(Deno.env.get("MONGO_DB"));

getAllData().then((data) => {

  const brandsRef = db.collection<IBrand>(`${Deno.env.get("MONGO_COLLECTION_PREFIX")}_brands`);
  for (const brand of data.brands) {
    brandsRef.replaceOne({ BrandId: brand.BrandId }, brand, { upsert: true })
  }

  const fuelsRef = db.collection<IFuel>(`${Deno.env.get("MONGO_COLLECTION_PREFIX")}_fuels`);
  for (const fuel of data.fuels) {
    fuelsRef.replaceOne({ FuelId: fuel.FuelId }, fuel, { upsert: true })
  }

  const sitesRef = db.collection<ISite>(`${Deno.env.get("MONGO_COLLECTION_PREFIX")}_sites`);
  for (const site of data.sites) {
    sitesRef.replaceOne({SiteId: site.SiteId}, site, {upsert: true})
  }

})

