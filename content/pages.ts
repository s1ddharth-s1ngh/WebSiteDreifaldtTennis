import type { Page } from "@/components/wix";
import home from "./pages/home.json";
import anmeldungen from "./pages/anmeldungen.json";
import tennisschuleKurse from "./pages/tennisschule-kurse.json";
import tennisclubs from "./pages/tennisclubs.json";
import eventsTurniere from "./pages/events-turniere.json";
import kidsJuniors from "./pages/kids-juniors.json";
import seniors from "./pages/seniors.json";
import miami from "./pages/miami.json";
import ueberUns from "./pages/ueber-uns.json";
import kontakt from "./pages/kontaktieren-sie-uns.json";

export const siteUrl = "https://www.dreifaldt-tennis.com";

export const pages = [
  home,
  anmeldungen,
  tennisschuleKurse,
  tennisclubs,
  eventsTurniere,
  kidsJuniors,
  seniors,
  miami,
  ueberUns,
  kontakt,
] as Page[];
