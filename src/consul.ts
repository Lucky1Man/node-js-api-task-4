import Consul, { ConsulOptions } from "consul";
import config from "./config";
import env from "./nodeEnvironment";

const consulServer = new Consul(config.consul.server[env] as ConsulOptions);

const prefix = `config/${config.consul.service.name}`;

type ConsulResult = {
  Value: string | number;
};

export const getConsulValue = async (key: string) => {
  const result: ConsulResult = await consulServer.kv.get(`${prefix}/${key}`);
  return result?.Value;
};

export const getConsultValueByCurrentEnvironment = async (key: string) => {
  return getConsulValue(`${env}${key.charAt(0) === '/' ? '' : '/'}${key}`);
};

export default getConsultValueByCurrentEnvironment;
