import {leaseExecutable} from '@android-operator/device';
import {leaseDirectory} from '../config.js';
export function leasedCommand(serial:string,command:readonly string[]) {
 if(!/^[a-zA-Z0-9_.:-]{1,96}$/.test(serial)||!command.length)throw new Error('Invalid device lease command');
 return {file:'python3',args:[leaseExecutable,serial,'--',...command],
  env:{...process.env,CUE_HELPER_LOCK_DIR:leaseDirectory()}};
}
