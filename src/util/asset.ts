import { parse } from "yaml";

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export const getMetadata = async (path: string): Promise<any> => {
    let versions = ['us', 'jp'];
    for(const version of versions) {
      try {
        const url = `ymls/${version}/${path.split('/').slice(0, -1).join('/')}.yml`;
        const response = await fetch(url);
        if(response.ok) {
          const text = await response.text();
          const data = parse(text);
          return data[path.split('/').pop()!];
        } else {
          console.error(`Metadata file not found for ${path} in version ${version}`);
        }
      } catch (e) {
        console.warn(`Failed to fetch metadata for ${path} in version ${version}:`, e);
      }
    }
    return undefined;
  }