export const formatDate=(value)=>value?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Never';
export function humanize(value=''){if(value.toLowerCase()==='contractor')return 'Connector';return value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())}
