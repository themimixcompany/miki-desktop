# script.nsi
# v1.2.1


#---------------------------------------------------------------------------------------------------
# Includes
#---------------------------------------------------------------------------------------------------

!include "MUI.nsh"
!include "LogicLib.nsh"
!include "${NSISDIR}\Contrib\Modern UI\System.nsh"


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


!define PRODUCT "Miki Desktop"
!define VERSION "1.0.0"

name "${PRODUCT}"

!define MUI_FILE "savefile"
!define MUI_BRANDINGTEXT "${PRODUCT}"
!define MUI_ICON "assets\icons\icon.ico"
!define MUI_UNICON "assets\icons\icon.ico"
!define MUI_SPECIALBITMAP "Bitmap.bmp"
!insertmacro MUI_LANGUAGE "English"

OutFile "out\${PRODUCT} Setup ${VERSION}.exe"
CRCCheck on
ShowInstDetails show
ShowUninstDetails show
InstallDir "$PROGRAMFILES64\${PRODUCT}"


#---------------------------------------------------------------------------------------------------
# Pages
#---------------------------------------------------------------------------------------------------

Page directory
Page instfiles


#---------------------------------------------------------------------------------------------------
# Installer
#---------------------------------------------------------------------------------------------------

Section "install" Installation
  CreateDirectory "$APPDATA\Mimix"
  SetOutPath "$APPDATA\Mimix"
  File /r "app\pgsql"
  File /r "app\miki"

  SetOutPath "$INSTDIR"
  File /r "out\Miki Desktop-win32-x64\*.*"

  CreateShortCut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\${MUI_FILE}.exe" ""

  CreateDirectory "$SMPROGRAMS\${PRODUCT}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT}\Uninstall.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk" "$INSTDIR\${MUI_FILE}.exe" "" "$INSTDIR\${MUI_FILE}.exe" 0

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}" "DisplayName" "${PRODUCT} (remove only)"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}" "UninstallString" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd


#---------------------------------------------------------------------------------------------------
# Uninstaller
#---------------------------------------------------------------------------------------------------

Section "Uninstall"
  RMDir /r "$INSTDIR\*.*"
  RMDir "$INSTDIR"

  Delete "$DESKTOP\${PRODUCT}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT}\*.*"
  RmDir  "$SMPROGRAMS\${PRODUCT}"

  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\${PRODUCT}"
  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}"
SectionEnd


#---------------------------------------------------------------------------------------------------
# MessageBox
#---------------------------------------------------------------------------------------------------

Function .onInstSuccess
  MessageBox MB_OK "You have successfully installed ${PRODUCT}."
FunctionEnd

Function un.onUninstSuccess
  MessageBox MB_OK "You have successfully uninstalled ${PRODUCT}."
FunctionEnd
