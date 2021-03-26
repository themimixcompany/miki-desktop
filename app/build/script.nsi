# script.nsi
# v1.0.0


#---------------------------------------------------------------------------------------------------
# Modern UI
#---------------------------------------------------------------------------------------------------


!define MUI_WELCOMEPAGE
!define MUI_LICENSEPAGE
!define MUI_DIRECTORYPAGE
!define MUI_ABORTWARNING
!define MUI_UNINSTALLER
!define MUI_UNCONFIRMPAGE
!define MUI_FINISHPAGE


#---------------------------------------------------------------------------------------------------
# General
#---------------------------------------------------------------------------------------------------

!include "LogicLib.nsh"
!include "${NSISDIR}\Contrib\Modern UI\System.nsh"

!define MUI_PRODUCT "Miki Desktop"
!define MUI_FILE "savefile"
!define MUI_VERSION "1.0.0"
!define MUI_BRANDINGTEXT "Miki Desktop"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_SPECIALBITMAP "Bitmap.bmp"

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_SYSTEM

CRCCheck On
OutFile "Miki Desktop Setup.exe"
ShowInstDetails "nevershow"
ShowUninstDetails "nevershow"
InstallDir "$PROGRAMFILES\${MUI_PRODUCT}"


#---------------------------------------------------------------------------------------------------
# Installer
#---------------------------------------------------------------------------------------------------

Section "install" Installation info
  CreateDirectory "${APPDATA}\Mimix"
  SetOutPath "${APPDATA}\Mimix"
  File /r "pgsql directory"
  File /r "miki directory"

  SetOutPath "${INSTDIR}"
  File /r "miki desktop directory"

  CreateShortCut "${DESKTOP}\${MUI_PRODUCT}.lnk" "${INSTDIR}\${MUI_FILE}.exe" ""

  CreateDirectory "${SMPROGRAMS}\${MUI_PRODUCT}"
  CreateShortCut "${SMPROGRAMS}\${MUI_PRODUCT}\Uninstall.lnk" "${INSTDIR}\Uninstall.exe" "" "${INSTDIR}\Uninstall.exe" 0
  CreateShortCut "${SMPROGRAMS}\${MUI_PRODUCT}\${MUI_PRODUCT}.lnk" "${INSTDIR}\${MUI_FILE}.exe" "" "${INSTDIR}\${MUI_FILE}.exe" 0

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${MUI_PRODUCT}" "DisplayName" "${MUI_PRODUCT} (remove only)"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${MUI_PRODUCT}" "UninstallString" "${INSTDIR}\Uninstall.exe"

  WriteUninstaller "${INSTDIR}\Uninstall.exe"
SectionEnd


#---------------------------------------------------------------------------------------------------
# Uninstaller
#---------------------------------------------------------------------------------------------------

Section "Uninstall"
  RMDir /r "${INSTDIR}\*.*"
  RMDir "${INSTDIR}"

  Delete "${DESKTOP}\${MUI_PRODUCT}.lnk"
  Delete "${SMPROGRAMS}\${MUI_PRODUCT}\*.*"
  RmDir  "${SMPROGRAMS}\${MUI_PRODUCT}"

  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\${MUI_PRODUCT}"
  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${MUI_PRODUCT}"
SectionEnd


#---------------------------------------------------------------------------------------------------
# MessageBox
#---------------------------------------------------------------------------------------------------

Function .onInstSuccess
  MessageBox MB_OK "You have successfully installed ${MUI_PRODUCT}."
FunctionEnd

Function un.onUninstSuccess
  MessageBox MB_OK "You have successfully uninstalled ${MUI_PRODUCT}."
FunctionEnd
