import { loadConfig } from '../src/server.mjs';
import { gatewaySettings } from '../src/service.mjs';
try {
  const config=loadConfig();
  if(config.mode!=='android')throw Error('Run npm run setup:phone first.');
  const settings=gatewaySettings(config);
  const response=await fetch(settings.base+'/health',{headers:{Authorization:settings.authorization},redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error(`Phone health endpoint returned HTTP ${response.status}. Check LAN access, credentials and the phone /docs route. No send was attempted.`);
  console.log('Phone health endpoint responded successfully. No SMS submitted. This does not prove SIM delivery or message-route compatibility.');
}catch(error){
  console.error(error.message?.startsWith('Phone health')||error.message?.startsWith('Run npm')?error.message:'Phone check failed. Check local configuration and the USB tunnel or trusted Wi-Fi. No SMS submitted.');
  process.exitCode=1;
}
