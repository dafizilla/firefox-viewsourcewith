<?xml version='1.0' encoding='utf-8' ?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" 
                xmlns:em="http://www.mozilla.org/2004/em-rdf#"
                xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#">

<xsl:variable name="extension-file">
    <xsl:choose>
        <xsl:when test="string-length($extension-filename)">
            <xsl:value-of select="$extension-filename"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="concat(//extension/@name, '.jar')"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:variable>

<xsl:template match="//locale" mode="install.rdf">
<em:locale>locale/<xsl:value-of select="@code"/>/<xsl:value-of select="//extension/@name"/>/</em:locale>
</xsl:template>

<xsl:template match="//locale" mode="install.js">
<xsl:text>&quot;</xsl:text><xsl:value-of select="@code"/><xsl:text>&quot;</xsl:text>
<xsl:choose>
    <xsl:when test="position() != last()"><xsl:text>,</xsl:text>
    <xsl:choose>
    <xsl:when test="(position() mod 4) = 0"><xsl:text>
                                    </xsl:text>
    </xsl:when>
    <xsl:otherwise><xsl:text> </xsl:text></xsl:otherwise>
    </xsl:choose>
    </xsl:when>
</xsl:choose>
</xsl:template>

<xsl:template match="//locale" mode="chrome-manifest">
<xsl:text>locale	</xsl:text><xsl:value-of select="//extension/@name"/>
<xsl:text>	</xsl:text>
<xsl:value-of select="@code"/>
<xsl:value-of select="name"/>	jar:chrome/<xsl:value-of select="//extension/@name"/>.jar!/locale/<xsl:value-of select="@code"/>/<xsl:value-of select="//extension/@name"/>/
</xsl:template>

<xsl:template match="//contributor" mode="install.rdf">
        <em:contributor><xsl:value-of select="." disable-output-escaping="yes"/></em:contributor>
</xsl:template>

<xsl:template match="//translator" mode="install.rdf">
        <em:translator><xsl:value-of select="." disable-output-escaping="yes"/></em:translator>
</xsl:template>

<xsl:template match="//compatibility/application" mode="install.rdf">
<xsl:text>

    </xsl:text>
    <xsl:comment><xsl:value-of select="concat(' ',description, ' ')"/></xsl:comment>
<xsl:text>
    </xsl:text>
    <em:targetApplication>
      <Description>
        <em:id><xsl:value-of select="id"/></em:id>
        <em:minVersion><xsl:value-of select="minVersion"/></em:minVersion>
        <em:maxVersion><xsl:value-of select="maxVersion"/></em:maxVersion>
      </Description>
    </em:targetApplication>
</xsl:template>
</xsl:stylesheet>
