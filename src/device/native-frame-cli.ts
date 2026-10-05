// Device subprocess: no source-checkout discovery or gameplay imports.
import {AdbCompanionPort} from '@android-operator/device';
const [serial,out]=process.argv.slice(2);
if(!serial||!out||!/^[a-zA-Z0-9_.:-]{1,96}$/.test(serial))throw new Error('Serial and output required');
const result=await new AdbCompanionPort({serial}).snap('operator-native',out);
console.log(JSON.stringify({...result,imageNs:String(result.imageNs),snapshotNs:String(result.snapshotNs)}));
