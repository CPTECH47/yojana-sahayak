import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { root } from '../src/server.mjs';
import { connectUsb } from '../src/usb.mjs';

const runtime=resolve(root,'.runtime');
const downloadedAdb=resolve(runtime,'tools/platform-tools/adb.exe');
const apk=resolve(runtime,'downloads/sms-gateway-v1.78.0.apk');
const officialApk='https://github.com/capcom6/android-sms-gateway/releases/download/v1.78.0/app-release.apk';
const apkHash='a4511489074d9a5eba52e0b2ab68eede3c184391b16afb46514b4bcf9bee565e';
function powershell(command, extra={}) {
  if(process.platform!=='win32')throw Error('Install official Android platform-tools for your OS, then use adb on PATH.');
  execFileSync('powershell.exe',['-NoProfile','-Command',command],{stdio:'inherit',windowsHide:true,env:{...process.env,...extra}});
}
try {
  mkdirSync(resolve(runtime,'downloads'),{recursive:true});
  let adb=process.env.ADB_PATH || downloadedAdb;
  if(!existsSync(adb)) {
    try { execFileSync('adb',['version'],{stdio:'ignore',windowsHide:true}); adb='adb'; }
    catch {
      console.log('Downloading official Google platform-tools into the private demo folder. No global installation or PATH changes.');
      powershell("$ErrorActionPreference='Stop'; Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $env.SMS_USB_ZIP -TimeoutSec 120; Expand-Archive -LiteralPath $env.SMS_USB_ZIP -DestinationPath $env.SMS_USB_TOOLS -Force",{SMS_USB_ZIP:resolve(runtime,'downloads/platform-tools-windows.zip'),SMS_USB_TOOLS:resolve(runtime,'tools')});
    }
  }
  const run=args=>execFileSync(adb,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:15000});
  const connection=connectUsb({run,localPort:Number(process.env.SMS_USB_LOCAL_PORT||18080),phonePort:Number(process.env.SMS_PHONE_PORT||8080)});
  writeFileSync(resolve(runtime,'usb.json'),JSON.stringify(connection,null,2),{mode:0o600});
  console.log(`USB tunnel ready: ${connection.gatewayUrl} -> Android Local Server port ${connection.phonePort}. No Wi-Fi required.`);
  if(process.argv.includes('--install')) {
    if(!existsSync(apk)) powershell("$ErrorActionPreference='Stop'; Invoke-WebRequest -Uri $env.SMS_OFFICIAL_APK -OutFile $env.SMS_LOCAL_APK -TimeoutSec 120",{SMS_OFFICIAL_APK:officialApk,SMS_LOCAL_APK:apk});
    if(createHash('sha256').update(readFileSync(apk)).digest('hex')!==apkHash)throw Error('Official APK checksum mismatch; installation refused.');
    try {
      const installed=execFileSync(adb,['-d','install','-r',apk],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:120000});
      if(!/^Success\s*$/m.test(installed))throw Error('Installation not confirmed');
      console.log('Official release APK installed. Open it on the phone, grant SEND_SMS when asked and start Local Server. No permissions were automatically granted.');
    }catch{throw Error('Android did not confirm installation. Unlock the phone and complete any installation confirmation, then retry. No uninstall or permission bypass was attempted.');}
  }
  const configPath=resolve(runtime,'config.json');
  if(existsSync(configPath)) {
    const config=JSON.parse(readFileSync(configPath,'utf8').replace(/^\uFEFF/,''));
    copyFileSync(configPath,resolve(runtime,'config.before-usb.json'));
    config.gatewayUrl=connection.gatewayUrl;
    writeFileSync(configPath,JSON.stringify(config,null,2),{mode:0o600});
    console.log('Private configuration now uses the USB URL. Restart the demo after setup; no SMS submitted.');
  }else console.log('Next run npm run setup:phone. Press Enter at the gateway URL prompt to use this USB connection.');
  console.log('Keep USB connected. Use npm run check:phone after Local Server is started. No SMS was sent.');
}catch(error){console.error(error.message?.includes('authorized')||error.message?.includes('phone')||error.message?.includes('USB')||error.message?.includes('APK')||error.message?.includes('forward')?error.message:'USB setup failed. Check the official tools, phone authorization and local files. No SMS sent.');process.exitCode=1;}
