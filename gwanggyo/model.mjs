// Values use 억원, decimal annual rates and years. This module has no UI dependencies.
export const DEFAULTS=Object.freeze({price:20.5,loan:4,deposit:11.5,interest:4.7,returnRate:2.5,months:24,taxRate:3.5,brokerRate:0.33,fixedCost:300,annualCost:800,renterCost:800,growth:0});
export function loanCap(price){return price<=15?6:price<=25?4:2;}
export function calculate(p){
  for(const value of Object.values(p))if(!Number.isFinite(value))throw new Error('모든 입력값을 숫자로 입력하세요.');
  if(p.price<=0||p.months<=0||p.loan<0||p.loan>p.price||p.deposit<0||p.interest<0||p.returnRate<0||p.taxRate<0||p.brokerRate<0||p.fixedCost<0||p.annualCost<0||p.renterCost<0||p.growth<=-100)throw new Error('가격·기간·비용은 유효한 양수 범위여야 하며, 대출은 매매가 이하여야 합니다.');
  const n=p.months/12,r=p.returnRate/100,i=p.interest/100,v=(p.taxRate+p.brokerRate)/100,f=p.fixedCost/10000,b=p.annualCost/10000,R=p.renterCost/10000;
  const C0=p.price*v+f,K=p.price+C0-p.loan,F=(1+r)**n,A=r===0?n:(F-1)/r;
  const released=K-p.deposit-R;
  const H=released*(F-1)+(p.loan*i+b)*A-R;
  const g=p.growth/100,futurePrice=p.price*(1+g),advantage=p.price*g*(1+v)-H;
  const monthlyRate=i/12,payments=360;
  const monthly=p.loan===0?0:monthlyRate===0?p.loan/payments:p.loan*monthlyRate*(1+monthlyRate)**payments/((1+monthlyRate)**payments-1);
  const futureLoan=Math.min(p.loan,loanCap(futurePrice));
  return {n,v,C0,K,F,A,released,H,futurePrice,advantage,breakEven:H/(p.price*(1+v)),monthly,futureLoan,futureCash:futurePrice*(1+v)+f-futureLoan};
}
