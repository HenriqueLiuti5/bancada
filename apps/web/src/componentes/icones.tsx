import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  AlarmIcon as Alarm,
  ArrowSquareOutIcon as ArrowSquareOut,
  ArrowsClockwiseIcon as ArrowsClockwise,
  ArrowsLeftRightIcon as ArrowsLeftRight,
  ArrowUUpLeftIcon as ArrowUUpLeft,
  BugIcon as Bug,
  CalendarCheckIcon as CalendarCheck,
  CalendarDotsIcon as CalendarDots,
  CameraIcon as Camera,
  CameraPlusIcon as CameraPlus,
  CaretLeftIcon as CaretLeft,
  CaretRightIcon as CaretRight,
  CaretUpDownIcon as CaretUpDown,
  ChartPieSliceIcon as ChartPieSlice,
  ChatTextIcon as ChatText,
  CheckCircleIcon as CheckCircle,
  CheckIcon as Check,
  ClipboardTextIcon as ClipboardText,
  ClockCounterClockwiseIcon as ClockCounterClockwise,
  ClockCountdownIcon as ClockCountdown,
  ClockIcon as Clock,
  CloudSlashIcon as CloudSlash,
  CompassIcon as Compass,
  CopyIcon as Copy,
  CreditCardIcon as CreditCard,
  CrownIcon as Crown,
  DeviceMobileIcon as DeviceMobile,
  EnvelopeSimpleIcon as EnvelopeSimple,
  EyeIcon as Eye,
  EyeSlashIcon as EyeSlash,
  FilePlusIcon as FilePlus,
  FileTextIcon as FileText,
  FileXIcon as FileX,
  GaugeIcon as Gauge,
  HandCoinsIcon as HandCoins,
  HandshakeIcon as Handshake,
  HashIcon as Hash,
  HeadsetIcon as Headset,
  HourglassIcon as Hourglass,
  HourglassLowIcon as HourglassLow,
  ImageSquareIcon as ImageSquare,
  InfoIcon as Info,
  InvoiceIcon as Invoice,
  KeyIcon as Key,
  LinkBreakIcon as LinkBreak,
  LinkSimpleIcon as LinkSimple,
  ListChecksIcon as ListChecks,
  LockSimpleIcon as LockSimple,
  MagnifyingGlassIcon as MagnifyingGlass,
  MapPinIcon as MapPin,
  MoneyIcon as Money,
  MonitorIcon as Monitor,
  MoonIcon as Moon,
  NotePencilIcon as NotePencil,
  PackageIcon as Package,
  PaperPlaneTiltIcon as PaperPlaneTilt,
  PasswordIcon as Password,
  PauseCircleIcon as PauseCircle,
  PhoneIcon as Phone,
  PiggyBankIcon as PiggyBank,
  PlusIcon as Plus,
  ProhibitIcon as Prohibit,
  PulseIcon as Pulse,
  QuestionIcon as Question,
  ReceiptIcon as Receipt,
  RepeatIcon as Repeat,
  SealCheckIcon as SealCheck,
  ShieldCheckIcon as ShieldCheck,
  SidebarSimpleIcon as SidebarSimple,
  SignOutIcon as SignOut,
  SlidersHorizontalIcon as SlidersHorizontal,
  SquaresFourIcon as SquaresFour,
  StackIcon as Stack,
  StampIcon as Stamp,
  StethoscopeIcon as Stethoscope,
  StorefrontIcon as Storefront,
  SunIcon as Sun,
  TargetIcon as Target,
  ThumbsUpIcon as ThumbsUp,
  TimerIcon as Timer,
  TrashIcon as Trash,
  TrayIcon as Tray,
  TrendDownIcon as TrendDown,
  TrendUpIcon as TrendUp,
  TruckIcon as Truck,
  UploadSimpleIcon as UploadSimple,
  UserCheckIcon as UserCheck,
  UserIcon as User,
  UserMinusIcon as UserMinus,
  UserPlusIcon as UserPlus,
  UsersIcon as Users,
  WalletIcon as Wallet,
  WarningCircleIcon as WarningCircle,
  WarningIcon as Warning,
  WhatsappLogoIcon as WhatsappLogo,
  WrenchIcon as Wrench,
  XCircleIcon as XCircle,
  XIcon as X,
} from "@phosphor-icons/react/ssr";
import { forwardRef } from "react";

export type { Icon };

function decorativo(Original: Icon): Icon {
  return forwardRef<SVGSVGElement, IconProps>(function IconeDecorativo(props, ref) {
    return <Original ref={ref} aria-hidden="true" {...props} />;
  });
}

export const AlarmIcon = decorativo(Alarm);
export const ArrowSquareOutIcon = decorativo(ArrowSquareOut);
export const ArrowsClockwiseIcon = decorativo(ArrowsClockwise);
export const ArrowsLeftRightIcon = decorativo(ArrowsLeftRight);
export const ArrowUUpLeftIcon = decorativo(ArrowUUpLeft);
export const BugIcon = decorativo(Bug);
export const CalendarCheckIcon = decorativo(CalendarCheck);
export const CalendarDotsIcon = decorativo(CalendarDots);
export const CameraIcon = decorativo(Camera);
export const CameraPlusIcon = decorativo(CameraPlus);
export const CaretLeftIcon = decorativo(CaretLeft);
export const CaretRightIcon = decorativo(CaretRight);
export const CaretUpDownIcon = decorativo(CaretUpDown);
export const ChartPieSliceIcon = decorativo(ChartPieSlice);
export const ChatTextIcon = decorativo(ChatText);
export const CheckCircleIcon = decorativo(CheckCircle);
export const CheckIcon = decorativo(Check);
export const ClipboardTextIcon = decorativo(ClipboardText);
export const ClockCounterClockwiseIcon = decorativo(ClockCounterClockwise);
export const ClockCountdownIcon = decorativo(ClockCountdown);
export const ClockIcon = decorativo(Clock);
export const CloudSlashIcon = decorativo(CloudSlash);
export const CompassIcon = decorativo(Compass);
export const CopyIcon = decorativo(Copy);
export const CreditCardIcon = decorativo(CreditCard);
export const CrownIcon = decorativo(Crown);
export const DeviceMobileIcon = decorativo(DeviceMobile);
export const EnvelopeSimpleIcon = decorativo(EnvelopeSimple);
export const EyeIcon = decorativo(Eye);
export const EyeSlashIcon = decorativo(EyeSlash);
export const FilePlusIcon = decorativo(FilePlus);
export const FileTextIcon = decorativo(FileText);
export const FileXIcon = decorativo(FileX);
export const GaugeIcon = decorativo(Gauge);
export const HandCoinsIcon = decorativo(HandCoins);
export const HandshakeIcon = decorativo(Handshake);
export const HashIcon = decorativo(Hash);
export const HeadsetIcon = decorativo(Headset);
export const HourglassIcon = decorativo(Hourglass);
export const HourglassLowIcon = decorativo(HourglassLow);
export const ImageSquareIcon = decorativo(ImageSquare);
export const InfoIcon = decorativo(Info);
export const InvoiceIcon = decorativo(Invoice);
export const KeyIcon = decorativo(Key);
export const LinkBreakIcon = decorativo(LinkBreak);
export const LinkSimpleIcon = decorativo(LinkSimple);
export const ListChecksIcon = decorativo(ListChecks);
export const LockSimpleIcon = decorativo(LockSimple);
export const MagnifyingGlassIcon = decorativo(MagnifyingGlass);
export const MapPinIcon = decorativo(MapPin);
export const MoneyIcon = decorativo(Money);
export const MonitorIcon = decorativo(Monitor);
export const MoonIcon = decorativo(Moon);
export const NotePencilIcon = decorativo(NotePencil);
export const PackageIcon = decorativo(Package);
export const PaperPlaneTiltIcon = decorativo(PaperPlaneTilt);
export const PasswordIcon = decorativo(Password);
export const PauseCircleIcon = decorativo(PauseCircle);
export const PhoneIcon = decorativo(Phone);
export const PiggyBankIcon = decorativo(PiggyBank);
export const PlusIcon = decorativo(Plus);
export const ProhibitIcon = decorativo(Prohibit);
export const PulseIcon = decorativo(Pulse);
export const QuestionIcon = decorativo(Question);
export const ReceiptIcon = decorativo(Receipt);
export const RepeatIcon = decorativo(Repeat);
export const SealCheckIcon = decorativo(SealCheck);
export const ShieldCheckIcon = decorativo(ShieldCheck);
export const SidebarSimpleIcon = decorativo(SidebarSimple);
export const SignOutIcon = decorativo(SignOut);
export const SlidersHorizontalIcon = decorativo(SlidersHorizontal);
export const SquaresFourIcon = decorativo(SquaresFour);
export const StackIcon = decorativo(Stack);
export const StampIcon = decorativo(Stamp);
export const StethoscopeIcon = decorativo(Stethoscope);
export const StorefrontIcon = decorativo(Storefront);
export const SunIcon = decorativo(Sun);
export const TargetIcon = decorativo(Target);
export const ThumbsUpIcon = decorativo(ThumbsUp);
export const TimerIcon = decorativo(Timer);
export const TrashIcon = decorativo(Trash);
export const TrayIcon = decorativo(Tray);
export const TrendDownIcon = decorativo(TrendDown);
export const TrendUpIcon = decorativo(TrendUp);
export const TruckIcon = decorativo(Truck);
export const UploadSimpleIcon = decorativo(UploadSimple);
export const UserCheckIcon = decorativo(UserCheck);
export const UserIcon = decorativo(User);
export const UserMinusIcon = decorativo(UserMinus);
export const UserPlusIcon = decorativo(UserPlus);
export const UsersIcon = decorativo(Users);
export const WalletIcon = decorativo(Wallet);
export const WarningCircleIcon = decorativo(WarningCircle);
export const WarningIcon = decorativo(Warning);
export const WhatsappLogoIcon = decorativo(WhatsappLogo);
export const WrenchIcon = decorativo(Wrench);
export const XCircleIcon = decorativo(XCircle);
export const XIcon = decorativo(X);
